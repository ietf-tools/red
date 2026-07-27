// @vitest-environment node
import { beforeEach, expect, test } from 'vitest'
import { staleWhileRevalidate } from './helpers'

const MAX_AGE_SECONDS = 60
const SWR_SECONDS = 300
const URL_UNDER_TEST = 'https://www.rfc-editor.org/some/origin/path'

/**
 * In-memory stand-in for `caches.default`. Bodies are read to completion on
 * `put` and rebuilt on `match`, so we sidestep the Response stream/clone rules
 * and can hand out an entry any number of times.
 */
class FakeCache {
  private store = new Map<string, { body: ArrayBuffer; status: number; headers: [string, string][] }>()

  async match(request: Request): Promise<Response | undefined> {
    const entry = this.store.get(request.url)
    if (!entry) {
      return undefined
    }
    return new Response(entry.body, { status: entry.status, headers: entry.headers })
  }

  async put(request: Request, response: Response): Promise<void> {
    this.store.set(request.url, {
      body: await response.arrayBuffer(),
      status: response.status,
      headers: [...response.headers]
    })
  }
}

// Per-test mutable state, reset in beforeEach.
let cache: FakeCache
let nowMs: number
let originVersion: string
let originStatus: number
let originResponseHeaders: Record<string, string>
let fetchCount: number
let lastFetchedUrl: string | undefined
let lastFetchRequest: Request | undefined

// Injected clock; tests advance it by assigning to nowMs.
const now = () => nowMs

// Injected origin; returns the current originVersion/originStatus/headers,
// records the request it was asked to fetch, and counts every hit.
const fetchFake = async (request: Request): Promise<Response> => {
  fetchCount++
  lastFetchedUrl = request.url
  lastFetchRequest = request
  return new Response(originVersion, { status: originStatus, headers: originResponseHeaders })
}

const deps = () => ({ cache, fetch: fetchFake, now })

function createCtx() {
  const tasks: Promise<unknown>[] = []
  const ctx: ExecutionContext = {
    waitUntil: (promise) => {
      tasks.push(Promise.resolve(promise))
    },
    passThroughOnException: () => {},
    props: {}
  }
  // Awaiting this drains any background revalidation the handler scheduled.
  const settled = () => Promise.all(tasks)
  return { ctx, settled }
}

const get = (url = URL_UNDER_TEST) => new Request(url, { method: 'GET' })

const call = (req: Request, ctx: ExecutionContext) =>
  staleWhileRevalidate(
    req,
    ctx,
    { maxAgeSeconds: MAX_AGE_SECONDS, additionalStaleWhileRevalidateSeconds: SWR_SECONDS },
    deps()
  )

beforeEach(() => {
  cache = new FakeCache()
  nowMs = 0
  originVersion = 'v1'
  originStatus = 200
  originResponseHeaders = {}
  fetchCount = 0
  lastFetchedUrl = undefined
  lastFetchRequest = undefined
})

test('miss: fetches origin, caches it, and tags the response with SWR cache-control', async () => {
  const { ctx } = createCtx()

  const resp = await call(get(), ctx)

  expect(fetchCount).toBe(1)
  expect(await resp.text()).toBe('v1')
  expect(resp.headers.get('cache-control')).toBe(
    `public, max-age=${MAX_AGE_SECONDS}, stale-while-revalidate=${SWR_SECONDS}`
  )
})

test('fresh hit: within maxAge serves from cache without re-fetching', async () => {
  const { ctx } = createCtx()
  await call(get(), ctx) // prime the cache

  originVersion = 'v2' // origin has moved on, but we are still fresh
  nowMs = (MAX_AGE_SECONDS - 1) * 1000
  const resp = await call(get(), ctx)

  expect(fetchCount).toBe(1) // no second origin hit
  expect(await resp.text()).toBe('v1')
})

test('stale hit: serves stale immediately and revalidates in the background', async () => {
  const primed = createCtx()
  await call(get(), primed.ctx)

  originVersion = 'v2'
  nowMs = (MAX_AGE_SECONDS + 1) * 1000 // stale, but inside the SWR window

  const stale = createCtx()
  const resp = await call(get(), stale.ctx)

  // The visitor gets the stale copy without waiting on the refreshed origin
  // response — proof the handler did not block on revalidation.
  expect(await resp.text()).toBe('v1')

  await stale.settled() // let the background revalidation finish
  expect(fetchCount).toBe(2) // origin was refreshed out-of-band

  // A subsequent request now sees the refreshed value from cache.
  const after = createCtx()
  const next = await call(get(), after.ctx)
  expect(await next.text()).toBe('v2')
  expect(fetchCount).toBe(2)
})

test('expired: past the SWR window it refetches synchronously', async () => {
  const { ctx } = createCtx()
  await call(get(), ctx)

  originVersion = 'v2'
  nowMs = (MAX_AGE_SECONDS + SWR_SECONDS + 1) * 1000 // fully expired
  const resp = await call(get(), ctx)

  expect(fetchCount).toBe(2)
  expect(await resp.text()).toBe('v2')
})

test('stale revalidation failure keeps serving the good stale entry', async () => {
  const primed = createCtx()
  await call(get(), primed.ctx) // cache a healthy v1

  originVersion = 'v2'
  originStatus = 500 // origin is now broken
  nowMs = (MAX_AGE_SECONDS + 1) * 1000 // stale, inside the SWR window

  const first = createCtx()
  const firstResp = await call(get(), first.ctx)
  expect(await firstResp.text()).toBe('v1') // still served the good stale copy
  await first.settled() // background revalidation runs and gets a 500

  // The 500 must not have poisoned the cache: another stale request still
  // gets v1, and the origin keeps being retried in the background.
  const second = createCtx()
  const secondResp = await call(get(), second.ctx)
  expect(await secondResp.text()).toBe('v1')
  await second.settled()
  expect(fetchCount).toBe(3) // 1 prime + 2 background retries

  // Once the origin recovers, the next revalidation repopulates the cache.
  originStatus = 200
  const recovered = createCtx()
  await call(get(), recovered.ctx)
  await recovered.settled()
  const next = await call(get(), createCtx().ctx)
  expect(await next.text()).toBe('v2')
})

test('miss with an origin error is returned but not cached', async () => {
  originStatus = 503
  const { ctx } = createCtx()

  const resp = await call(get(), ctx)
  expect(resp.status).toBe(503)
  expect(fetchCount).toBe(1)
  // The error must not be decorated with SWR cache-control — browsers should
  // not cache a 5xx.
  expect(resp.headers.get('cache-control')).toBeNull()

  // Nothing was stored, so the next request hits the origin again.
  originStatus = 200
  const retry = await call(get(), createCtx().ctx)
  expect(fetchCount).toBe(2)
  expect(await retry.text()).toBe('v1')
})

test('404s are cached so repeated hits for missing pages are absorbed', async () => {
  originStatus = 404
  originVersion = 'not found'

  const first = await call(get(), createCtx().ctx)
  expect(first.status).toBe(404)
  expect(first.headers.get('cache-control')).toBe(
    `public, max-age=${MAX_AGE_SECONDS}, stale-while-revalidate=${SWR_SECONDS}`
  )
  expect(fetchCount).toBe(1)

  // A repeat within maxAge is served from cache — the origin is not hit again.
  nowMs = (MAX_AGE_SECONDS - 1) * 1000
  const second = await call(get(), createCtx().ctx)
  expect(second.status).toBe(404)
  expect(fetchCount).toBe(1)
})

test('query strings are stripped from the cache key and the origin request', async () => {
  // A first request with one random query string primes the cache.
  await call(get(`${URL_UNDER_TEST}?cachebust=aaa`), createCtx().ctx)
  expect(fetchCount).toBe(1)
  expect(lastFetchedUrl).toBe(URL_UNDER_TEST) // origin was asked for the normalized URL

  // A different query string on the same path is a cache hit — this is what
  // collapses a query-randomized flood onto one entry.
  originVersion = 'v2'
  const resp = await call(get(`${URL_UNDER_TEST}?cachebust=zzz`), createCtx().ctx)
  expect(fetchCount).toBe(1) // no extra origin hit
  expect(await resp.text()).toBe('v1')
})

test('the origin is fetched with manual redirect mode so 3xx is returned, not followed', async () => {
  await call(get(), createCtx().ctx)
  expect(lastFetchRequest?.redirect).toBe('manual')
})

test.each([301, 302, 307, 308])(
  '%i redirects are cached so repeated hits are not proxied to origin',
  async (status) => {
    const location = 'https://www.rfc-editor.org/info/rfc9999/'
    originStatus = status
    originVersion = ''
    originResponseHeaders = { location }

    const first = await call(get(), createCtx().ctx)
    expect(first.status).toBe(status)
    expect(first.headers.get('location')).toBe(location)
    expect(first.headers.get('cache-control')).toBe(
      `public, max-age=${MAX_AGE_SECONDS}, stale-while-revalidate=${SWR_SECONDS}`
    )
    expect(fetchCount).toBe(1)

    // A repeat within maxAge is served from cache — origin is not hit again.
    nowMs = (MAX_AGE_SECONDS - 1) * 1000
    const second = await call(get(), createCtx().ctx)
    expect(second.status).toBe(status)
    expect(second.headers.get('location')).toBe(location)
    expect(fetchCount).toBe(1)
  }
)

test('no client headers are forwarded to origin — only the URL is fetched', async () => {
  const req = new Request(URL_UNDER_TEST, {
    method: 'GET',
    headers: {
      range: 'bytes=0-99',
      'if-none-match': '"abc"',
      'if-modified-since': 'Wed, 21 Oct 2026 07:28:00 GMT',
      'if-range': '"abc"',
      cookie: 'session=secret',
      authorization: 'Bearer secret',
      'x-custom': 'anything'
    }
  })
  await call(req, createCtx().ctx)

  // The origin request is built from the URL alone; none of the client's
  // headers ride along, so no denylist can be defeated by one we forgot.
  for (const header of [
    'range',
    'if-none-match',
    'if-modified-since',
    'if-range',
    'cookie',
    'authorization',
    'x-custom'
  ]) {
    expect(lastFetchRequest?.headers.get(header)).toBeNull()
  }
})

test('the internal stored-at timestamp header never leaks to the client', async () => {
  const miss = await call(get(), createCtx().ctx)
  expect(miss.headers.get('x-swr-stored-at-ms')).toBeNull()

  nowMs = (MAX_AGE_SECONDS - 1) * 1000
  const hit = await call(get(), createCtx().ctx)
  expect(hit.headers.get('x-swr-stored-at-ms')).toBeNull()
})

test('Set-Cookie from origin is not stored in the shared cache entry', async () => {
  originResponseHeaders = { 'set-cookie': 'session=secret; Path=/' }
  const miss = await call(get(), createCtx().ctx)
  expect(miss.headers.get('set-cookie')).toBeNull()

  // The cached copy served to other users must not carry it either.
  nowMs = (MAX_AGE_SECONDS - 1) * 1000
  const hit = await call(get(), createCtx().ctx)
  expect(hit.headers.get('set-cookie')).toBeNull()
  expect(fetchCount).toBe(1)
})
