import { setTimeoutPromise } from './promises'

type FetchOptions = NonNullable<Parameters<typeof fetch>[1]>

/** `fetch()` failure messages browsers throw when a request never got a response to read at all.
   Chrome, Firefox, Safari, and Node's `undici` each word it differently, but none of them say why:
   a browser withholds the real cause of an unreadable response from script for security reasons,
   so a CORS rejection looks identical here to being offline, a DNS failure, or a refused
   connection. Matched case-insensitively since Nuxt's SSR fetch (`ofetch`, backed by `undici`) can
   surface the same failure with different casing to a fetch running in the browser. */
const OPAQUE_FETCH_FAILURE_MESSAGES = [
  'failed to fetch',
  'networkerror when attempting to fetch resource.',
  'load failed',
  'fetch failed'
]

const isOpaqueFetchFailure = (message: string): boolean => OPAQUE_FETCH_FAILURE_MESSAGES.includes(message.toLowerCase())

const opaqueFetchFailureMessage = (message: string): string =>
  `${message} (the browser withholds the reason a request like this fails, so this can be a CORS restriction, a network outage, or the server being unreachable, check network tab for specifics)`

type NodeSystemError = Error & { code: string }

const isNodeSystemError = (error: unknown): error is NodeSystemError =>
  error instanceof Error && 'code' in error && typeof error.code === 'string'

// A TCP connect that never got underway: nothing this specific ever reaches a browser, whose
// `fetch()` redacts the real cause instead of exposing it (that's what OPAQUE_FETCH_FAILURE_MESSAGES
// above is for) -- but Node's `fetch()` (undici) throws a `TypeError: fetch failed` whose `.cause`
// is the underlying `ErrnoException`, and h3's `createError` carries `.cause` through onto the
// `NuxtError` a server-rendered page's `error` ref ends up holding.
//
// Telling this environment's own network apart from the remote end takes more than "did it fail
// to connect": most Kubernetes NetworkPolicy/CNI enforcement denies egress by silently dropping
// the packet -- no RST, no ICMP -- so a SYN that gets no answer at all times out, which is
// `ETIMEDOUT`, not a distinct "no route" code. `ENETUNREACH`/`EHOSTUNREACH` are the narrower case:
// no route exists, or the denial is an explicit ICMP-unreachable reject rule. `ECONNREFUSED` is a
// TCP RST, which is genuinely ambiguous between "nothing's listening at the other end" and "a
// policy here actively rejects rather than drops" -- an errno alone can't tell those apart.
// `ECONNRESET` is different in kind from the other three: a connection that was established and
// then torn down mid-stream, which egress denial (enforced before the handshake ever completes)
// doesn't produce, so it reads as a remote/proxy problem rather than this environment's.
const EGRESS_BLOCKED_CODES = new Set(['ENETUNREACH', 'EHOSTUNREACH'])
const CONNECTION_TIMED_OUT_CODES = new Set(['ETIMEDOUT'])
const CONNECTION_REFUSED_CODES = new Set(['ECONNREFUSED', 'ECONNRESET'])
const DNS_FAILURE_CODES = new Set(['ENOTFOUND', 'EAI_AGAIN'])

// Walks `error`, then `error.cause`, then its `.cause`, etc, for the first `NodeSystemError` --
// `fetch failed` and any `createError` wrapping around it are both plain `Error`s with no `code` of
// their own, so the error that actually explains the failure is a level or two down.
const findSystemError = (error: unknown): NodeSystemError | undefined => {
  for (let current = error, depth = 0; current !== undefined && depth < 5; depth++) {
    if (isNodeSystemError(current)) {
      return current
    }
    current = current instanceof Error ? current.cause : undefined
  }
  return undefined
}

/** Every `.message` down `error`'s `.cause` chain, joined -- `String(error)` only shows the
   outermost one, and Node's own errors nest layers (a `fetch failed` `TypeError` wrapping the
   `ErrnoException` that actually explains it), so a caller composing its own context-carrying
   message -- `~/utilities/reef-precomputed`'s `unreadable`, for one -- would otherwise bury or drop
   the detail that actually explains the failure. Exported for the same reason `describeNetworkFailure`
   below is: this has to run while `.cause` is still the live object graph `fetch()` threw, and its
   result, unlike `.cause` itself, belongs in `message` -- see that function's doc comment for why. */
export const describeCauseChain = (error: unknown): string => {
  const messages: string[] = []
  for (let current: unknown = error, depth = 0; current !== undefined && depth < 5; depth++) {
    if (!(current instanceof Error)) {
      messages.push(String(current))
      break
    }
    messages.push(current.message)
    current = current.cause
  }
  return messages.join(': ')
}

/** Diagnoses `error`'s `.cause` chain into an explanation worth showing alongside its technical
   message, or `undefined` when nothing in it is a `NodeSystemError`. Deliberately just the
   explanation, not the technical detail too -- that belongs in `message` (`describeCauseChain`
   above builds it), and `httpErrorMessage` shows both rather than one replacing the other.
   Exported, rather than folded straight into `httpErrorMessage`, so a call site that creates a
   `NuxtError` from a caught fetch failure -- `~/utilities/reef-precomputed`'s `unreadable`, for one
   -- can run this itself while `.cause` is still intact and bake the result into `data`. That's
   necessary, not just tidy: `.cause` is a live object graph that never crosses the wire. Nuxt's
   server->client payload reduces a `NuxtError` through `H3Error.toJSON()`, which keeps `message`,
   `statusCode`, `statusMessage`, and `data` and drops `.cause` outright, so the exact same walk run
   again against the post-hydration error finds nothing -- a diagnosis this function reaches during
   a server render would otherwise show correctly in the HTML that ships and then vanish the moment
   the client re-renders. `data` is the one field of those four meant for exactly this: a
   caller-defined payload the framework carries through unexamined. */
export const describeNetworkFailure = (error: unknown): string | undefined => {
  const systemError = findSystemError(error)
  if (systemError === undefined) {
    return undefined
  }
  if (EGRESS_BLOCKED_CODES.has(systemError.code)) {
    return 'this network has no route to that host at all, which is what egress being blocked here -- eg a Kubernetes NetworkPolicy -- looks like, rather than a problem with the remote service'
  }
  if (CONNECTION_TIMED_OUT_CODES.has(systemError.code)) {
    return 'the connection got no response at all before timing out -- this reads at least as much like egress being silently dropped here as it does a slow or unreachable remote host, since most network policies deny that way rather than by rejecting outright'
  }
  if (CONNECTION_REFUSED_CODES.has(systemError.code)) {
    return 'the connection was refused -- either nothing is listening at the other end, or something in between rejected it'
  }
  if (DNS_FAILURE_CODES.has(systemError.code)) {
    return 'that hostname could not be resolved, check DNS is reachable from here'
  }
  return undefined
}

// The fallback for a `describeNetworkFailure` that already ran and lost its `.cause` to
// serialization -- see that function's doc comment. Structural rather than a fixed key set, since
// `NuxtError<DataT>.data` is typed `unknown` regardless of what a given caller put there.
const preservedNetworkFailure = (error: unknown): string | undefined => {
  if (!isNuxtError(error) || typeof error.data !== 'object' || error.data === null) {
    return undefined
  }
  const { data } = error
  return 'networkFailureMessage' in data && typeof data.networkFailureMessage === 'string'
    ? data.networkFailureMessage
    : undefined
}

/** Turns an error from a failed HTTP request -- eg the `error` ref `useAsyncData`/`useFetch`
   return -- into a message worth showing a reader. `createError`/Nuxt's `NuxtError` carry a
   `status`, which is the useful case; anything else falls back to the error's own message.
   Checked against the network-level failures above -- both the OS-level ones a server render can
   actually name and the opaque ones a browser can't -- before either path formats its message, not
   just in the plain-`Error` path: `useAsyncData`/`useFetch` run every rejection through
   `createError`, which wraps a bare fetch failure in a `NuxtError` with `status` defaulted to
   500 and no `statusText`, so by the time it reaches here it passes `isNuxtError` too -- and
   without this check first, it would print as a fabricated "HTTP 500" instead of the more useful
   message that's actually available.
   When a network-level diagnosis applies, the technical message stays in the result rather than
   being replaced by the explanation: `error.message` (whatever wrapped the failure -- eg
   `unreadable`'s "[reef] could not read the published subjects: ...", already carrying the full
   `.cause` chain via `describeCauseChain`) plus the explanation in parentheses, never the
   explanation alone. A reader gets the plain-language reading; anyone filing or debugging the
   issue still gets the raw error text to search or attach, not a paraphrase standing in for it. */
export const httpErrorMessage = (error: unknown): string => {
  const explanation = describeNetworkFailure(error) ?? preservedNetworkFailure(error)
  if (explanation !== undefined) {
    const technicalMessage = error instanceof Error ? error.message : String(error)
    return `${technicalMessage} (${explanation})`
  }

  if (isNuxtError(error)) {
    const { status, statusText, message } = error
    const description = statusText ?? message
    if (description !== undefined && isOpaqueFetchFailure(description)) {
      return opaqueFetchFailureMessage(description)
    }
    return description ? `HTTP ${status}: ${description}` : `HTTP ${status}`
  }

  if (error instanceof Error) {
    return isOpaqueFetchFailure(error.message) ? opaqueFetchFailureMessage(error.message) : error.message
  }

  return String(error)
}

const MAX_ATTEMPTS_DEFAULT = 3
const DELAY_BETWEEN_RETRIES_MS_DEFAULT = 200

/** a `fetch()` wrapper that retries if there's a failure,
   working around transient network errors (ie WiFi connectivity)
*/
export const fetchRetry = (
  url: string,
  fetchOptions?: FetchOptions,
  retryOptions?: {
    delayBetweenRetriesMs: number
    maxAttempts: number
  }
) =>
  new Promise<Response>((resolve, reject) => {
    ;(async () => {
      const errors: string[] = []
      let remainingAttempts = retryOptions?.maxAttempts ?? MAX_ATTEMPTS_DEFAULT
      while (remainingAttempts > 0) {
        remainingAttempts--
        try {
          const response = await fetch(url, fetchOptions)
          if (!response.ok) {
            throw Error(`HTTP ${response.status}: ${response.statusText}`)
          }
          resolve(response)
          return
        } catch (e: unknown) {
          errors.push(typeof e === 'object' && e !== null ? e.toString() : `${e}`)
          console.log('error', remainingAttempts, e)
          await setTimeoutPromise(retryOptions?.delayBetweenRetriesMs ?? DELAY_BETWEEN_RETRIES_MS_DEFAULT)
        }
      }
      reject(errors.join(','))
    })()
  })
