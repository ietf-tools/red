// @vitest-environment nuxt
import { test, expect } from 'vitest'
import { describeCauseChain, describeNetworkFailure, httpErrorMessage } from './network'

// A Node system error, shaped the way `fetch()` (undici) attaches one to `.cause` -- a plain
// `Error` whose message is the libuv wording and whose `code` is the errno name.
const systemError = (code: string, message: string): Error & { code: string } =>
  Object.assign(new Error(message), { code })

// What a real caller -- `~/utilities/reef-precomputed`'s `unreadable`, for one -- actually builds:
// a context-carrying message via `describeCauseChain`, plus the same `cause` chain live underneath
// it. Mirrors `unreadable`'s own construction rather than reef-precomputed's wording specifically,
// since this module doesn't know about Reef.
const wrappedFetchFailure = (cause: Error) =>
  createError({ statusCode: 500, message: `could not read the file: ${describeCauseChain(cause)}`, cause })

test('describeCauseChain: walks every `.cause` level, most specific last', () => {
  const connectError = systemError('ENETUNREACH', 'connect ENETUNREACH 34.120.0.1:443')
  const fetchFailed = new Error('fetch failed', { cause: connectError })
  expect(describeCauseChain(fetchFailed)).toEqual('fetch failed: connect ENETUNREACH 34.120.0.1:443')
})

test('describeCauseChain: a non-Error cause is stringified rather than dropped', () => {
  expect(describeCauseChain('the index is not published')).toEqual('the index is not published')
})

test('httpErrorMessage: a NuxtError with a status reports it', () => {
  const error = createError({ statusCode: 404, statusMessage: 'Not Found' })
  expect(httpErrorMessage(error)).toEqual('HTTP 404: Not Found')
})

test('httpErrorMessage: a NuxtError with no statusMessage falls back to its message', () => {
  const error = createError({ statusCode: 500, message: 'boom' })
  expect(httpErrorMessage(error)).toEqual('HTTP 500: boom')
})

test('httpErrorMessage: a bare opaque fetch failure gets the CORS/network caveat', () => {
  expect(httpErrorMessage(new Error('Failed to fetch'))).toMatch(/^Failed to fetch \(the browser withholds/)
})

test('httpErrorMessage: an opaque fetch failure wrapped in a NuxtError still gets the caveat', () => {
  // What `useAsyncData` actually hands `error` ref subscribers: it runs every rejection through
  // `createError`, which -- with no `statusCode` on the input -- defaults to 500 and leaves
  // `statusMessage` unset. Without the fix this rendered as a fabricated "HTTP 500: fetch failed".
  const error = createError(new Error('fetch failed'))
  expect(httpErrorMessage(error)).toMatch(/^fetch failed \(the browser withholds/)
})

test('httpErrorMessage: ENETUNREACH a few `.cause` levels down reads as an egress problem, technical text included', () => {
  const connectError = systemError('ENETUNREACH', 'connect ENETUNREACH 34.120.0.1:443')
  const fetchFailed = new Error('fetch failed', { cause: connectError })
  const error = wrappedFetchFailure(fetchFailed)
  expect(httpErrorMessage(error)).toEqual(
    'could not read the file: fetch failed: connect ENETUNREACH 34.120.0.1:443 (this network has no route to that host at all, which is what egress being blocked here -- eg a Kubernetes NetworkPolicy -- looks like, rather than a problem with the remote service)'
  )
})

test('httpErrorMessage: EHOSTUNREACH also reads as an egress problem', () => {
  const error = wrappedFetchFailure(systemError('EHOSTUNREACH', 'connect EHOSTUNREACH 34.120.0.1:443'))
  expect(httpErrorMessage(error)).toMatch(
    /^could not read the file: connect EHOSTUNREACH .* \(this network has no route.*egress being blocked/
  )
})

test.each(['ECONNREFUSED', 'ECONNRESET'])(
  'httpErrorMessage: %s reads as a refused connection, technical text included',
  (code) => {
    const error = wrappedFetchFailure(systemError(code, `connect ${code} 34.120.0.1:443`))
    expect(httpErrorMessage(error)).toEqual(
      `could not read the file: connect ${code} 34.120.0.1:443 (the connection was refused -- either nothing is listening at the other end, or something in between rejected it)`
    )
  }
)

test('httpErrorMessage: ETIMEDOUT reads as possibly this environment, not just the remote end', () => {
  // Most Kubernetes NetworkPolicy/CNI enforcement denies egress by silently dropping the packet
  // rather than rejecting it, which is exactly what an unanswered connection attempt looks like --
  // so unlike ECONNREFUSED, this shouldn't pin the blame on the remote end.
  const error = wrappedFetchFailure(systemError('ETIMEDOUT', 'connect ETIMEDOUT 34.120.0.1:443'))
  const message = httpErrorMessage(error)
  expect(message).toMatch(/^could not read the file: connect ETIMEDOUT 34\.120\.0\.1:443 \(/)
  expect(message).toMatch(/egress being silently dropped here/)
})

test.each(['ENOTFOUND', 'EAI_AGAIN'])(
  'httpErrorMessage: %s reads as a DNS problem, technical text included',
  (code) => {
    const error = wrappedFetchFailure(systemError(code, `getaddrinfo ${code} example.invalid`))
    expect(httpErrorMessage(error)).toEqual(
      `could not read the file: getaddrinfo ${code} example.invalid (that hostname could not be resolved, check DNS is reachable from here)`
    )
  }
)

test('httpErrorMessage: a network diagnosis baked into `data` survives losing its `.cause`, technical text included', () => {
  // Simulates what actually reaches the client: Nuxt's payload reduces a NuxtError through
  // `H3Error.toJSON()`, which keeps `message` and `data` but drops `.cause` outright (that round
  // trip is reproduced here rather than asserted against directly, since it's the payload plugins'
  // behaviour, not this module's). `~/utilities/reef-precomputed`'s `unreadable` is the real caller
  // that runs `describeNetworkFailure` up front and stores its answer this way.
  const connectError = systemError('ENETUNREACH', 'connect ENETUNREACH 34.120.0.1:443')
  const fetchFailed = new Error('fetch failed', { cause: connectError })
  const networkFailureMessage = describeNetworkFailure(fetchFailed)
  const serverError = createError({
    statusCode: 500,
    message: `could not read the file: ${describeCauseChain(fetchFailed)}`,
    cause: fetchFailed,
    data: { networkFailureMessage }
  })

  const wireShape = serverError.toJSON()
  expect(wireShape).not.toHaveProperty('cause')
  const clientError = createError(wireShape)

  expect(httpErrorMessage(clientError)).toEqual(
    `could not read the file: fetch failed: connect ENETUNREACH 34.120.0.1:443 (${networkFailureMessage})`
  )
})

test('httpErrorMessage: an ordinary Error falls back to its own message', () => {
  expect(httpErrorMessage(new Error('something else broke'))).toEqual('something else broke')
})

test('httpErrorMessage: a non-Error is stringified', () => {
  expect(httpErrorMessage('just a string')).toEqual('just a string')
})
