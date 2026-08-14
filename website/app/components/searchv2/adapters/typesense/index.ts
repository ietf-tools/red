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
  /**
   * Cap on facet values returned per attribute in the main search. Defaults to Typesense's
   * implicit 10; set explicitly to make the cap intentional and to control when `facetTruncated`
   * fires. Values beyond this are only reachable via the search-for-facet-values channel.
   */
  maxFacetValues?: number
  /**
   * Typo tolerance for the search-for-facet-values query. Typesense matches `facet_query`
   * by token prefix, and its default of two typos surfaces values the user plainly did not
   * type (`lensin` matches `J. Lentini`). Defaults to 0: strict prefix, no typos.
   */
  facetQueryNumTypos?: number
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
  stats: z
    .object({ min: z.number().optional(), max: z.number().optional(), total_values: z.number().optional() })
    .optional()
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
  const {
    host,
    apiKey,
    collection,
    cacheTtlMs = DEFAULT_CACHE_TTL_MS,
    facetQueryNumTypos = 0,
    protocol = 'https',
    port = 443
  } = config

  const cache = new Map<string, { at: number; value: SearchResponse }>()
  const facetCache = new Map<string, { at: number; value: FacetHit[] }>()

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
    const { attribute, query, maxFacetHits = 10, search } = request

    // Typesense computes `facet_query` over the facet counts of the search it accompanies, so
    // replaying the current search parameters is what narrows the offered values (and their
    // counts) to the current results. Without `search` we can only span the whole collection.
    const searchParams = {
      ...(search
        ? buildSearchParams(search, config, resolvePreset(search))
        : { q: '*', preset: typeof config.preset === 'string' ? config.preset : undefined }),
      facet_by: attribute,
      facet_query: `${attribute}:${query}`,
      facet_query_num_typos: facetQueryNumTypos,
      max_facet_values: maxFacetHits,
      // Facet values are all we want back; without this Typesense also ships whole documents.
      sort_by: undefined,
      page: undefined,
      per_page: 0
    }
    const key = stableStringify(searchParams)

    const cached = facetCache.get(key)
    if (cached && Date.now() - cached.at < cacheTtlMs) return cached.value

    const parsed = await post({ searches: [{ collection, ...searchParams }] })
    const counts = parsed.results[0]?.facet_counts?.find((facet) => facet.field_name === attribute)?.counts ?? []
    const value = counts.map((count) => ({ value: count.value, count: count.count, highlighted: count.highlighted }))
    facetCache.set(key, { at: Date.now(), value })
    return value
  }

  return {
    search,
    searchForFacetValues,
    clearCache: () => {
      cache.clear()
      facetCache.clear()
    }
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
    max_facet_values: request.facets.length > 0 ? config.maxFacetValues : undefined,
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
  const facetTruncated: Record<string, boolean> = {}

  for (const facetCount of result.facet_counts ?? []) {
    facets[facetCount.field_name] = Object.fromEntries(facetCount.counts.map((count) => [count.value, count.count]))
    const { stats } = facetCount
    if (stats && stats.min !== undefined && stats.max !== undefined) {
      facetStats[facetCount.field_name] = { min: stats.min, max: stats.max }
    }
    // Typesense reports the total distinct values via `stats.total_values`; if it exceeds the
    // number of counts we got back, the returned list was capped (by `max_facet_values`).
    if (stats?.total_values !== undefined && stats.total_values > facetCount.counts.length) {
      facetTruncated[facetCount.field_name] = true
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
    facetStats: Object.keys(facetStats).length > 0 ? facetStats : undefined,
    facetTruncated: Object.keys(facetTruncated).length > 0 ? facetTruncated : undefined
  }
}
