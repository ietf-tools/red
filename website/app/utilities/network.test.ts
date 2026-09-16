// @vitest-environment nuxt
import { test, expect } from 'vitest'
import { describeNetworkFailure, httpErrorMessage } from './network'

// A Node system error, shaped the way `fetch()` (undici) attaches one to `.cause` -- a plain
// `Error` whose message is the libuv wording and whose `code` is the errno name.
const systemError = (code: string, message: string): Error & { code: string } =>
  Object.assign(new Error(message), { code })

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

test('httpErrorMessage: ENETUNREACH a few `.cause` levels down reads as an egress problem', () => {
  const connectError = systemError('ENETUNREACH', 'connect ENETUNREACH 34.120.0.1:443')
  const fetchFailed = new Error('fetch failed', { cause: connectError })
  const error = createError({ statusCode: 500, cause: fetchFailed })
  expect(httpErrorMessage(error)).toEqual(
    'connect ENETUNREACH 34.120.0.1:443 (this network has no route to that host at all, which is what egress being blocked here -- eg a Kubernetes NetworkPolicy -- looks like, rather than a problem with the remote service)'
  )
})

test('httpErrorMessage: EHOSTUNREACH also reads as an egress problem', () => {
  const error = createError({
    statusCode: 500,
    cause: systemError('EHOSTUNREACH', 'connect EHOSTUNREACH 34.120.0.1:443')
  })
  expect(httpErrorMessage(error)).toMatch(/egress being blocked/)
})

test.each(['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT'])(
  'httpErrorMessage: %s reads as the remote end failing, not this environment',
  (code) => {
    const error = createError({ statusCode: 500, cause: systemError(code, `connect ${code} 34.120.0.1:443`) })
    expect(httpErrorMessage(error)).toMatch(/refused the connection or never answered/)
  }
)

test.each(['ENOTFOUND', 'EAI_AGAIN'])('httpErrorMessage: %s reads as a DNS problem', (code) => {
  const error = createError({ statusCode: 500, cause: systemError(code, `getaddrinfo ${code} example.invalid`) })
  expect(httpErrorMessage(error)).toMatch(/could not be resolved/)
})

test('httpErrorMessage: a network diagnosis baked into `data` survives losing its `.cause`', () => {
  // Simulates what actually reaches the client: Nuxt's payload reduces a NuxtError through
  // `H3Error.toJSON()`, which keeps `data` but drops `.cause` outright (that round trip is
  // reproduced here rather than asserted against directly, since it's the payload plugins'
  // behaviour, not this module's). `~/utilities/reef-precomputed`'s `unreadable` is the real
  // caller that runs `describeNetworkFailure` up front and stores its answer this way.
  const connectError = systemError('ENETUNREACH', 'connect ENETUNREACH 34.120.0.1:443')
  const fetchFailed = new Error('fetch failed', { cause: connectError })
  const networkFailureMessage = describeNetworkFailure(fetchFailed)
  const serverError = createError({ statusCode: 500, cause: fetchFailed, data: { networkFailureMessage } })

  const wireShape = serverError.toJSON()
  expect(wireShape).not.toHaveProperty('cause')
  const clientError = createError(wireShape)

  expect(httpErrorMessage(clientError)).toEqual(networkFailureMessage)
})

test('httpErrorMessage: an ordinary Error falls back to its own message', () => {
  expect(httpErrorMessage(new Error('something else broke'))).toEqual('something else broke')
})

test('httpErrorMessage: a non-Error is stringified', () => {
  expect(httpErrorMessage('just a string')).toEqual('just a string')
})
