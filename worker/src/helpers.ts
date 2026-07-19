import z from 'zod'
import type { IRequest } from 'itty-router'

export function redirectTo(targetUrl: string, status = 302): (req: IRequest) => Response {
  return (req: IRequest) => {
    if (targetUrl.startsWith('/')) {
      const newUrl = new URL(targetUrl, req.url)
      return Response.redirect(newUrl.href, status)
    } else {
      return Response.redirect(targetUrl, status)
    }
  }
}

export function addNormalizedPath(req: IRequest, ..._args: unknown[]): void {
  const url = new URL(req.url)
  req.normalizedPath = decodeURIComponent(url.pathname.endsWith('/') ? url.pathname.slice(0, -1) : url.pathname)
}

export function createBlobResponse(
  object: R2ObjectBody,
  contentType?: string,
  canonicalUrl?: string,
  cacheControl?: number
): Response {
  const headers = new Headers()
  object.writeHttpMetadata(headers)
  headers.set('etag', object.httpEtag)
  headers.set('Cf-R2-Served', '1')
  headers.set('Access-Control-Allow-Origin', '*')
  headers.set('Content-Encoding', 'gzip')
  if (contentType) {
    headers.set('Content-Type', contentType)
  }
  if (canonicalUrl) {
    const formattedCanonicalUrl = formatCanonicalHeader(canonicalUrl)
    if (formattedCanonicalUrl) {
      headers.set('Link', formattedCanonicalUrl)
    }
  }
  if (cacheControl) {
    headers.set('Cache-Control', `public, max-age=${cacheControl}`)
  }

  return new Response(object.body, {
    headers
  })
}

export function createBlobNotFoundResponse(): Response {
  return new Response('404 - Not found', {
    status: 404,
    headers: { 'Content-Type': 'text/plain;charset=utf-8' }
  })
}

const SWR_STORED_AT_MS_HEADER = 'x-swr-stored-at-ms'

// These are WIDTHS that compound, not absolute boundaries: total lifetime is
// maxAgeSeconds + additionalStaleWhileRevalidateSeconds. An entry is fresh for
// maxAgeSeconds, then stale-served for a further additionalStaleWhileRevalidateSeconds,
// then expired. So additionalStaleWhileRevalidateSeconds is the extra stale width
// past freshness — NOT the total lifetime. Both are assumed non-negative.
type StaleWhileRevalidateOptions = {
  maxAgeSeconds: number
  additionalStaleWhileRevalidateSeconds: number
}

/**
 * Injectable collaborators so this can be unit tested without touching the
 * runtime globals. Production callers pass `caches.default`, the global `fetch`,
 * and `Date.now`; tests pass fakes.
 */
type StaleWhileRevalidateDeps = {
  cache: Pick<Cache, 'match' | 'put'>
  fetch: (request: Request) => Promise<Response>
  now: () => number
}

function withBrowserSwrHeaders(
  resp: Response,
  { maxAgeSeconds, additionalStaleWhileRevalidateSeconds }: StaleWhileRevalidateOptions
): Response {
  const out = new Response(resp.body, resp)
  out.headers.set(
    'Cache-Control',
    `public, max-age=${maxAgeSeconds}, stale-while-revalidate=${additionalStaleWhileRevalidateSeconds}`
  )
  // Never leak our internal bookkeeping header to the client.
  out.headers.delete(SWR_STORED_AT_MS_HEADER)
  return out
}

const CACHEABLE_REDIRECTS = new Set([301, 302, 307, 308])

/**
 * Cache successful responses, 404s, and redirects.
 *
 * - 404s so that a flood of requests for non-existent origin pages is absorbed
 *   by the cache instead of hammering the origin.
 * - Redirects (301/302/307/308) so the origin isn't re-hit for what is a fixed
 *   answer during the stale window. This relies on the origin request using
 *   `redirect: 'manual'` so `fetch()` hands us the real 3xx + Location instead
 *   of silently following it.
 *
 * 5xx (and every other error) is never cached, so a failing origin can neither
 * be cached nor poison an existing good entry.
 */
function isCacheable(resp: Response): boolean {
  return resp.ok || resp.status === 404 || CACHEABLE_REDIRECTS.has(resp.status)
}

/**
 * Serve a fetch()-backed response with stale-while-revalidate semantics, backed
 * by the Workers Cache API (per-colo). We manage the cache ourselves because the
 * Cache API does not honor the `stale-while-revalidate` directive, and a Worker
 * cannot inject that directive into the edge cache populated by `fetch()`.
 *
 * - Fresh (age <= maxAgeSeconds): served from cache.
 * - Stale (maxAgeSeconds < age <= maxAgeSeconds + additionalStaleWhileRevalidateSeconds):
 *   the stale copy is served immediately and the origin is re-fetched in the
 *   background via `ctx.waitUntil()`, so no visitor blocks on revalidation.
 * - Miss or fully expired: fetched from origin synchronously, then cached.
 *
 * Only successful responses, 404s, and redirects are cached (see isCacheable).
 * The origin does not vary by query string, so the query is stripped from both
 * the cache key and the origin request: this collapses query-randomized floods
 * (a common cache-busting DDoS tactic) onto a single cached entry.
 *
 * The incoming request may be GET or HEAD (HEAD is used by the site health
 * check); either way we fetch the origin with GET and share one cache entry.
 * The `.all('*')` router handler rejects every other method before we get here.
 */
export async function staleWhileRevalidate(
  req: Request,
  ctx: ExecutionContext,
  options: StaleWhileRevalidateOptions,
  { cache, fetch, now }: StaleWhileRevalidateDeps
): Promise<Response> {
  const { maxAgeSeconds, additionalStaleWhileRevalidateSeconds } = options
  const totalTtlSeconds = maxAgeSeconds + additionalStaleWhileRevalidateSeconds

  // The origin webserver doesn't (shouldn't!) vary responses by query so this should be safe to do
  const normalizedUrl = new URL(req.url)
  normalizedUrl.search = ''
  const cacheKey = new Request(normalizedUrl.toString(), { method: 'GET' })

  // Fetch origin with nothing but the URL — deliberately no client headers. The
  // origin is a public, read-only site that doesn't vary its response by request
  // headers, so forwarding them buys nothing and only invites cache bugs: Range
  // would make origin answer 206 (which the Cache API refuses to store, throwing),
  // a conditional would invite a 304 our cache doesn't model, and Cookie /
  // Authorization would let a per-user response be cached under the shared key.
  // `redirect: 'manual'` makes fetch() hand us the actual 3xx response (with its
  // Location) instead of silently following it — so a redirect can be cached and
  // returned to the browser rather than costing an extra origin round-trip.
  const originRequest = new Request(normalizedUrl.toString(), {
    method: 'GET',
    redirect: 'manual'
  })

  const revalidate = async (): Promise<Response> => {
    const fresh = await fetch(originRequest)
    if (!isCacheable(fresh)) {
      return fresh
    }
    const stored = new Response(fresh.body, fresh)
    stored.headers.set(SWR_STORED_AT_MS_HEADER, now().toString())
    // Never cache a per-user cookie under a shared key.
    stored.headers.delete('set-cookie')
    // Retain the entry in the Cache API for the whole stale window.
    stored.headers.set('Cache-Control', `public, max-age=${totalTtlSeconds}`)
    await cache.put(cacheKey, stored.clone())
    return stored
  }

  const cached = await cache.match(cacheKey)
  if (cached) {
    const storedAtMs = Number(cached.headers.get(SWR_STORED_AT_MS_HEADER) ?? 0)
    const ageSeconds = (now() - storedAtMs) / 1000

    if (ageSeconds > maxAgeSeconds && ageSeconds <= totalTtlSeconds) {
      // Stale but usable: serve now, refresh in the background.
      ctx.waitUntil(revalidate())
    }
    if (ageSeconds <= totalTtlSeconds) {
      return withBrowserSwrHeaders(cached, options)
    }
  }

  // Cold miss (or fully expired): advertise SWR caching only for a cacheable
  // response (2xx/404) — never tell the browser to cache an origin error.
  const fresh = await revalidate()
  return isCacheable(fresh) ? withBrowserSwrHeaders(fresh, options) : fresh
}

export function detectContentType(path: string): string | undefined {
  if (!path.includes('.')) {
    return
  }

  const extension = path.substring(path.lastIndexOf('.'))
  switch (extension) {
    case '.json':
      return 'application/json;charset=utf-8'
    case '.ico':
      return 'image/png'
    case '.txt':
      return 'text/plain;charset=utf-8'
    case '.png':
      return 'image/png'
    case '.css':
      return 'text/css; charset=utf-8'
    case '.js':
      return 'text/javascript; charset=utf-8'
    case '.xml':
      if (path.endsWith('rfcatom.xml')) {
        return 'application/atom+xml;charset=utf-8'
      } else {
        return 'application/xml;charset=utf-8'
      }
  }
}

function formatCanonicalHeader(url: string): string | undefined {
  try {
    const validatedUrl = new URL(url).toString()
    const encodedUrl = encodeURI(validatedUrl).replace(/</g, '%3C').replace(/>/g, '%3E')

    return `<${encodedUrl}>; rel="canonical"`
  } catch (e: unknown) {
    console.error('Invalid canonical url', url, e)
    return undefined
  }
}

export const monthNames = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
]

/**
 * TypeSense wants spaces encoded as '+' char not '%20'.
 */
export const typeSenseEncodeUriComponent = (uriComponent: string) =>
  encodeURIComponent(uriComponent).replace(/%20/g, '+')

const SEARCH_PATH = '/search/'
export const statusSchema = z.union([
  z.literal('Internet Standard'),
  z.literal('Proposed Standard'),
  z.literal('Draft Standard'),
  z.literal('Best Current Practice'),
  z.literal('Informational'),
  z.literal('Experimental'),
  z.literal('Historic'),
  z.literal('Unknown')
])
type Status = z.infer<typeof statusSchema>
type SearchPathBuilderProps = {
  q: string
  area: string
  stream: string
  status: Status[]
  from: string
  to: string
  showObsoleted?: '1'
}

export const searchPathBuilder = (searchParams: Partial<SearchPathBuilderProps>, envDomain: string = ''): string => {
  const hasParams = Object.values(searchParams).join('').trim().length > 0
  return `https://www${envDomain}.rfc-editor.org${SEARCH_PATH}${hasParams ? '?' : ''}${
    hasParams
      ? Object.keys(searchParams)
          .toSorted() // normalize order
          .map((searchKey) => {
            const typesenseSearchKey = searchKey
            const searchValue = searchParams[searchKey as keyof SearchPathBuilderProps]

            return searchValue
              ? `${encodeURIComponent(typesenseSearchKey)}=${typeSenseEncodeUriComponent(
                  Array.isArray(searchValue) ? searchValue.join(',') : searchValue
                )}`
              : ''
          })
          .filter(Boolean)
          .join('&')
      : ''
  }`
}

export const rfcEditorErrataSearchUrl = (envDomain: string = '') => `https://errata${envDomain}.rfc-editor.org/search/`

export async function emptyFileResponse(req: IRequest): Promise<Response | undefined> {
  const headers = new Headers()
  headers.set('Access-Control-Allow-Origin', '*')
  const contentType = detectContentType(req.normalizedPath)
  if (contentType) {
    headers.set('Content-Type', contentType)
  }
  return new Response('', { headers })
}

type RedTypesenseSearchRequestBuilderProps = {
  typesenseApiKey: string
  searchQuery: string
  typesenseHost: string
  paginationOffset: number
  resultPerPage: number
}
export const redTypesenseSearchRequestBuilder = ({
  typesenseApiKey,
  searchQuery,
  typesenseHost,
  paginationOffset,
  resultPerPage
}: RedTypesenseSearchRequestBuilderProps) => {
  return {
    url: `${typesenseHost}/multi_search?x-typesense-api-key=${typesenseApiKey}`,
    body: JSON.stringify({
      searches: [
        {
          preset: 'red',
          collection: 'docs',
          q: searchQuery,
          facet_by: 'area.full,authors.name,flags.hiddenDefault,group.full,publicationDate,status.name,stream.name',
          filter_by: 'flags.hiddenDefault:=[false]',
          max_facet_values: 200,
          page: paginationOffset,
          per_page: resultPerPage
        }
      ]
    })
  }
}

export const escapeHTML = (str: string) =>
  String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

export class SafeHTML {
  constructor(readonly value: string) {}
  toString() {
    return this.value
  }
}

export const safe = (html: string) => new SafeHTML(html)

export const htmlTemplate = (strings: TemplateStringsArray, ...values: (string | SafeHTML)[]) => {
  let result = strings[0]
  for (let i = 0; i < values.length; i++) {
    const value = values[i]
    result += value instanceof SafeHTML ? value.value : escapeHTML(String(value ?? ''))
    result += strings[i + 1]
  }
  return new SafeHTML(result)
}
