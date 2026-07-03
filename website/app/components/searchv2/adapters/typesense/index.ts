import { z } from 'zod'
import type { FacetHit, SearchClient, SearchForFacetValuesRequest, SearchRequest, SearchResponse } from '../../types'
import { stableStringify } from '../../utils/stableStringify'

export type TypesenseAdapterConfig = {
  host: string
  apiKey: string
  collection: string
  /** Preset name, static or derived per-request (e.g. `red` vs `red-content`). */
  preset?: string | ((request: SearchRequest) => string | undefined)
  /** Neutral sortBy value -> Typesense `sort_by` clause. */
  sortMap?: Record<string, string>
  /**
   * Host hook for extra `filter_by` clauses (e.g. a constant `type:=rfc`, or mapping
   * a boolean toggle to a filter). Keeps all app-specific filtering out of the library.
   */
  filterFor?: (request: SearchRequest) => string[]
  cacheTtlMs?: number
  protocol?: string
  port?: number
}

const DEFAULT_CACHE_TTL_MS = 2 * 60 * 1000

const FacetCountSchema = z.object({
  field_name: z.string(),
  counts: z.array(
    z.object({
      value: z.string(),
      count: z.number(),
      highlighted: z.string().optional()
    })
  ),
  stats: z.object({ min: z.number().optional(), max: z.number().optional() }).optional()
})

const ResultSchema = z.object({
  found: z.number(),
  hits: z.array(z.object({ document: z.record(z.string(), z.unknown()) })).default([]),
  facet_counts: z.array(FacetCountSchema).optional(),
  search_time_ms: z.number().optional()
})

const MultiSearchResponseSchema = z.object({ results: z.array(ResultSchema).min(1) })

/** Creates a backend-agnostic SearchClient backed by Typesense `multi_search`. */
export function createTypesenseSearchClient(config: TypesenseAdapterConfig): SearchClient {
  const { host, apiKey, collection, cacheTtlMs = DEFAULT_CACHE_TTL_MS, protocol = 'https', port = 443 } = config

  const cache = new Map<string, { at: number; value: SearchResponse }>()

  const url = `${protocol}://${host}:${port}/multi_search`

  const post = async (body: unknown): Promise<z.infer<typeof MultiSearchResponseSchema>> => {
    const response = await fetch(`${url}?x-typesense-api-key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    if (!response.ok) {
      throw new Error(`[searchv2/typesense] search failed: ${response.status} ${response.statusText}`)
    }
    return MultiSearchResponseSchema.parse(await response.json())
  }

  const resolvePreset = (request: SearchRequest): string | undefined =>
    typeof config.preset === 'function' ? config.preset(request) : config.preset

  const search = async (request: SearchRequest): Promise<SearchResponse> => {
    const searchParams = buildSearchParams(request, config, resolvePreset(request))
    const key = stableStringify(searchParams)

    const cached = cache.get(key)
    if (cached && Date.now() - cached.at < cacheTtlMs) return cached.value

    const parsed = await post({ searches: [{ collection, ...searchParams }] })
    const value = toSearchResponse(parsed.results[0]!, request)
    cache.set(key, { at: Date.now(), value })
    return value
  }

  const searchForFacetValues = async (request: SearchForFacetValuesRequest): Promise<FacetHit[]> => {
    const { attribute, query, maxFacetHits = 10 } = request
    const parsed = await post({
      searches: [
        {
          collection,
          q: '*',
          preset: config.preset && typeof config.preset === 'string' ? config.preset : undefined,
          facet_by: attribute,
          facet_query: `${attribute}:${query}`,
          max_facet_values: maxFacetHits,
          per_page: 1
        }
      ]
    })
    const counts = parsed.results[0]?.facet_counts?.find((facet) => facet.field_name === attribute)?.counts ?? []
    return counts.map((count) => ({ value: count.value, count: count.count, highlighted: count.highlighted }))
  }

  return {
    search,
    searchForFacetValues,
    clearCache: () => cache.clear()
  }
}

function buildSearchParams(request: SearchRequest, config: TypesenseAdapterConfig, preset: string | undefined) {
  const filters = [...buildFilters(request), ...(config.filterFor?.(request) ?? [])].filter(Boolean)
  const sortBy = request.sortBy ? (config.sortMap?.[request.sortBy] ?? request.sortBy) : undefined

  return {
    q: request.query.length > 0 ? request.query : '*',
    preset,
    filter_by: filters.length > 0 ? filters.join(' && ') : undefined,
    facet_by: request.facets.length > 0 ? request.facets.join(',') : undefined,
    sort_by: sortBy,
    page: request.page + 1, // Typesense pages are 1-based
    per_page: request.hitsPerPage
  }
}

function buildFilters(request: SearchRequest): string[] {
  const clauses: string[] = []

  for (const [attribute, values] of Object.entries(request.refinements)) {
    if (values.length > 0) clauses.push(`${attribute}:=[${values.map(quote).join(',')}]`)
  }
  for (const [attribute, value] of Object.entries(request.menu)) {
    if (value) clauses.push(`${attribute}:=${quote(value)}`)
  }
  for (const [attribute, range] of Object.entries(request.numericRefinements)) {
    if (range.min !== undefined) clauses.push(`${attribute}:>=${range.min}`)
    if (range.max !== undefined) clauses.push(`${attribute}:<=${range.max}`)
  }

  return clauses
}

/** Backtick-quote a facet value for Typesense filter syntax. */
function quote(value: string): string {
  return `\`${value.replaceAll('`', '')}\``
}

function toSearchResponse(result: z.infer<typeof ResultSchema>, request: SearchRequest): SearchResponse {
  const facets: Record<string, Record<string, number>> = {}
  const facetStats: Record<string, { min: number; max: number }> = {}

  for (const facetCount of result.facet_counts ?? []) {
    facets[facetCount.field_name] = Object.fromEntries(facetCount.counts.map((count) => [count.value, count.count]))
    const { stats } = facetCount
    if (stats && stats.min !== undefined && stats.max !== undefined) {
      facetStats[facetCount.field_name] = { min: stats.min, max: stats.max }
    }
  }

  return {
    hits: result.hits.map((hit) => hit.document),
    nbHits: result.found,
    page: request.page,
    nbPages: Math.ceil(result.found / request.hitsPerPage),
    hitsPerPage: request.hitsPerPage,
    processingTimeMS: result.search_time_ms ?? 0,
    facets: Object.keys(facets).length > 0 ? facets : undefined,
    facetStats: Object.keys(facetStats).length > 0 ? facetStats : undefined
  }
}
