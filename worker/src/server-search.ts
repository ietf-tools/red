import { env } from 'cloudflare:workers'
import { IRequest } from 'itty-router'
import { z } from 'zod'
import { escapeHTML, htmlTemplate, redTypesenseSearchRequestBuilder, safe } from './helpers'

const TypesenseFacetCountSchema = z.object({
  counts: z.array(z.unknown()),
  field_name: z.string(),
  sampled: z.boolean(),
  stats: z.object({
    total_values: z.number()
  })
})

const TypesenseRequestParamsSchema = z.object({
  collection_name: z.string(),
  first_q: z.string(),
  per_page: z.number(),
  q: z.string()
})

const TypesenseHitSchema = z.object({
  document: z.object({
    rfc: z.string(),
    title: z.string()
  })
})

const TypesenseResultSchema = z.object({
  facet_counts: z.array(TypesenseFacetCountSchema),
  found: z.number(),
  hits: z.array(TypesenseHitSchema),
  out_of: z.number(),
  page: z.number(),
  request_params: TypesenseRequestParamsSchema,
  search_cutoff: z.boolean(),
  search_time_ms: z.number()
})

export const TypesenseResponseSchema = z.object({
  results: z.array(TypesenseResultSchema)
})

export type TypesenseResponse = z.infer<typeof TypesenseResponseSchema>

// This route is only iframed by non-JS browsers so we can disable scripts etc to improve security
const SECURITY_HEADERS = {
  'Content-Security-Policy':
    "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'self'",
  'X-Frame-Options': 'SAMEORIGIN',
  'X-Content-Type-Options': 'nosniff'
}

const TYPESENSE_API_KEY_PARAM = 'x-typesense-api-key'
const SEARCH_QUERY_PARAM = 'q'
const SEARCH_PAGINATION_PARAM = 'page'
const RESULTS_PER_PAGE = 10
const FIRST_PAGE_OF_RESULTS = 1

/**
 * A basic search for non-JS users.
 */
export async function serverSearch(req: IRequest, _env: Env): Promise<Response | undefined> {
  const typesenseHost = env.NUXT_PUBLIC_TYPESENSE_HOST
  const { searchParams } = new URL(req.url, 'https://localhost/')
  const userSearch = searchParams.get(SEARCH_QUERY_PARAM)
  const paginationOffsetString = searchParams.get(SEARCH_PAGINATION_PARAM)
  const paginationOffset = paginationOffsetString ? parseInt(paginationOffsetString) : 1
  const searchQuery = userSearch ?? '*'

  const head = `<head><title>Search results "${escapeHTML(searchQuery)}"</title><style>body{color:black;background:white;font-family:sans-serif}.link{display:inline-block;padding:0.5rem;} .link:hover,.link:focus{background-color:#eee}</style></head>`

  if (!typesenseHost) {
    return new Response(
      `<!DOCTYPE html><html>${head}<body><h1>Search needs NUXT_PUBLIC_TYPESENSE_HOST</h1></body></html>`,
      {
        status: 500,
        headers: { 'Content-Type': 'text/html;charset=utf-8', ...SECURITY_HEADERS }
      }
    )
  }

  const typesenseApiKey = searchParams.get(TYPESENSE_API_KEY_PARAM)
  if (!typesenseApiKey) {
    return new Response(`<!DOCTYPE html><html>${head}<body><h1>Search needs typesense API key</h1></body></html>`, {
      status: 500,
      headers: { 'Content-Type': 'text/html;charset=utf-8', ...SECURITY_HEADERS }
    })
  }

  const requestPojo = redTypesenseSearchRequestBuilder({
    typesenseApiKey,
    searchQuery,
    paginationOffset,
    resultPerPage: RESULTS_PER_PAGE,
    typesenseHost: `https://${typesenseHost.replace(/^https:\/\//, '')}`
  })

  const currentUrl = new URL('/api/v1/search/', req.url)
  if (userSearch) {
    currentUrl.searchParams.set(SEARCH_QUERY_PARAM, searchQuery)
  }

  try {
    const typesenseResponse = await fetch(requestPojo.url, {
      method: 'post',
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        Accept: 'application/json, text/plain, */*'
      },
      body: requestPojo.body
    })

    const responseText = await typesenseResponse.text()

    if (!typesenseResponse.ok) {
      console.error(`[typesense proxy search HTTP ${typesenseResponse.status}] ${responseText}`)
      return new Response(
        String(
          htmlTemplate`<!DOCTYPE html><html>${head}<body><h1>Search is down</h1><p>${requestPojo.url}</p><p>${String(typesenseResponse.status)}: ${responseText}</p></body></html>`
        ),
        {
          status: typesenseResponse.status,
          headers: { 'Content-Type': 'text/html;charset=utf-8', ...SECURITY_HEADERS }
        }
      )
    }

    const { data, error } = TypesenseResponseSchema.safeParse(JSON.parse(responseText))
    if (error || !data) {
      console.error(`[typesense proxy parse error]`, error, data)
      return new Response(
        `<!DOCTYPE html><html>${head}<body><h1>Internal error parsing search response. Please report this bug.</h1></body></html>`,
        {
          status: 500,
          headers: { 'Content-Type': 'text/html;charset=utf-8', ...SECURITY_HEADERS }
        }
      )
    }

    const totalResults = data.results.reduce((sum, { found }) => sum + found, 0)
    const totalPagesOfResults = Math.ceil(totalResults / RESULTS_PER_PAGE)

    const previousUrl = new URL(currentUrl)
    previousUrl.searchParams.set(SEARCH_PAGINATION_PARAM, String(Math.max(FIRST_PAGE_OF_RESULTS, paginationOffset - 1)))
    previousUrl.searchParams.set(TYPESENSE_API_KEY_PARAM, typesenseApiKey)
    const previous =
      paginationOffset > FIRST_PAGE_OF_RESULTS
        ? htmlTemplate`<a href="${safe(previousUrl.toString())}">Previous page</a>`
        : ''
    const nextUrl = new URL(currentUrl)
    nextUrl.searchParams.set(SEARCH_PAGINATION_PARAM, String(paginationOffset + 1))
    nextUrl.searchParams.set(TYPESENSE_API_KEY_PARAM, typesenseApiKey)
    const next =
      paginationOffset * RESULTS_PER_PAGE < totalResults
        ? htmlTemplate`<a href="${safe(nextUrl.toString())}">Next page</a>`
        : ''
    const hits = data.results.flatMap((result) => result.hits)
    const items = hits.map((hit) => {
      // must be target="_top" to escape the iframe
      return htmlTemplate`<li><a href="/info/rfc${hit.document.rfc}/" target="_top" class="link">RFC <b>${hit.document.rfc}</b>: ${hit.document.title}</a></li>`
    })
    const html = htmlTemplate`<!DOCTYPE html><html>${safe(head)}<body>${
      userSearch
        ? htmlTemplate`<h1>Search results ${JSON.stringify(searchQuery)}</h1>`
        : htmlTemplate`<h1>Recent RFCs</h1>`
    }<p>${String(totalResults)} result(s) (page ${String(paginationOffset)} of ${String(totalPagesOfResults)})</p><ul>${safe(
      items.join('')
    )}</ul><p>${previous}${previous && next ? ' | ' : ''}${next}</p></html>`

    return new Response(html.toString(), {
      status: 200,
      headers: { 'Content-Type': 'text/html;charset=utf-8', ...SECURITY_HEADERS }
    })
  } catch (e: unknown) {
    return new Response(
      String(htmlTemplate`<!DOCTYPE html><html>${head}<body><h1>Search is down</h1><p>${String(e)}</p></body></html>`),
      {
        status: 500,
        headers: { 'Content-Type': 'text/html;charset=utf-8', ...SECURITY_HEADERS }
      }
    )
  }
}
