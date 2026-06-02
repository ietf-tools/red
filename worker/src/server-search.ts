import { env } from 'cloudflare:workers'
import { IRequest } from 'itty-router'
import { z } from 'zod'
import { htmlTemplate, redTypesenseSearchRequestBuilder, safe } from './helpers'

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

const TYPESENSE_API_KEY_PARAM = 'x-typesense-api-key'
const SEARCH_QUERY_PARAM = 'q'

export async function serverSearch(req: IRequest, _env: Env): Promise<Response | undefined> {
  const typesenseHost = env.NUXT_PUBLIC_TYPESENSE_HOST
  if(!typesenseHost) {
    return new Response(`<!DOCTYPE html><style>body{color:black;background:white}</style><h1>Search needs NUXT_PUBLIC_TYPESENSE_HOST</h1>`, {
      status: 500,
      headers: { 'Content-Type': 'text/html;charset=utf-8' }
    })
  }
  const { searchParams } = new URL(req.url, 'https://localhost/')
  const typesenseApiKey = searchParams.get(TYPESENSE_API_KEY_PARAM)
  if (!typesenseApiKey) {
    return new Response(`<!DOCTYPE html><style>body{color:black;background:white}</style><h1>Search needs valid API key</h1>`, {
      status: 500,
      headers: { 'Content-Type': 'text/html;charset=utf-8' }
    })
  }
  const searchQuery = searchParams.get(SEARCH_QUERY_PARAM)

  const requestPojo = redTypesenseSearchRequestBuilder(
    typesenseApiKey,
    searchQuery ?? '*',
    `https://${typesenseHost.replace(/^https:\/\//, '')}` 
  )

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
        `<!DOCTYPE html><style>body{color:black;background:white}</style><h1>Search is down</h1><p>${requestPojo.url}</p><p>${typesenseResponse.status}: ${responseText}</p>`,
        {
          status: typesenseResponse.status,
          headers: { 'Content-Type': 'text/html;charset=utf-8' }
        }
      )
    }

    const { data, error } = TypesenseResponseSchema.safeParse(JSON.parse(responseText))
    if (error || !data) {
      console.error(`[typesense proxy parse error]`, error, data)
      return new Response(`<!DOCTYPE html><style>body{color:black;background:white}</style><h1>Internal error parsing search response. Please report this bug.</h1>`, {
        status: 500,
        headers: { 'Content-Type': 'text/html;charset=utf-8' }
      })
    }

    const hits = data.results.flatMap((result) => result.hits)
    const items = hits.map(
      (hit) =>
        htmlTemplate`<li><a href="/info/${hit.document.rfc}/" target="_top">RFC <b>${hit.document.rfc}</b> ${hit.document.title}</a></li>`
    )
    const html = htmlTemplate`<!DOCTYPE html><style>body{color:black;background:white}</style><h1>Search results</h1><ul>${safe(items.join(''))}</ul>`

    return new Response(html.toString(), {
      status: 200,
      headers: { 'Content-Type': 'text/html;charset=utf-8' }
    })
  } catch (e: unknown) {
    return new Response(
      `<!DOCTYPE html><style>body{color:black;background:white}</style><h1>Search is down</h1><p>${e}</p>`,
      {
        status: 500,
        headers: { 'Content-Type': 'text/html;charset=utf-8' }
      }
    )
  }
}
