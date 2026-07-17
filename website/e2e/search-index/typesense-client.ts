// Minimal fetch-only Typesense client for the search-index quality tests.
//
// Mirrors the production request shape (see app/utilities/searchv2-rfc-client.ts and
// app/components/searchv2/adapters/typesense/index.ts): collection `docs`, a constant
// `type:=rfc` filter, the `red`/`red-content` preset swap, and backtick-quoted facet
// refinements. It deliberately does NOT import that app code — only the connection info.

import { z } from 'zod'
import { getTypesenseConfig } from './config.ts'

export type Preset = 'red' | 'red-content'

export type SearchCaseInput = {
  query: string
  preset: Preset
  /** Facet refinements, attribute -> selected values (e.g. `{ 'stream.name': ['IETF'] }`). */
  refinements?: Record<string, string[]>
  perPage?: number
}

export type RfcHit = {
  rfcNumber: number
  title: string
}

export type SearchResult = {
  found: number
  hits: RfcHit[]
  /** Ordered list of RFC numbers as returned, for rank assertions. */
  rfcNumbers: number[]
}

const COLLECTION = 'docs'
const DEFAULT_PER_PAGE = 100

const ResultSchema = z.object({
  found: z.number(),
  hits: z
    .array(
      z.object({
        document: z.object({
          rfcNumber: z.number(),
          title: z.string().default('')
        })
      })
    )
    .default([])
})

const MultiSearchResponseSchema = z.object({ results: z.array(ResultSchema).min(1) })

/** Backtick-quote a facet value for Typesense filter syntax (matches production `quote`). */
const quote = (value: string): string => `\`${value.replaceAll('`', '')}\``

const buildFilterBy = (refinements: Record<string, string[]> | undefined): string => {
  const clauses = ['type:=rfc']
  for (const [attribute, values] of Object.entries(refinements ?? {})) {
    if (values.length > 0) {
      clauses.push(`${attribute}:=[${values.map(quote).join(',')}]`)
    }
  }
  return clauses.join(' && ')
}

const multiSearch = async (body: unknown): Promise<z.infer<typeof MultiSearchResponseSchema>> => {
  const { host, apiKey } = getTypesenseConfig()
  const url = `https://${host}:443/multi_search?x-typesense-api-key=${encodeURIComponent(apiKey)}`

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })

  if (!response.ok) {
    throw new Error(`Typesense multi_search failed: ${response.status} ${response.statusText}`)
  }

  return MultiSearchResponseSchema.parse(await response.json())
}

/** Runs a single RFC search and returns the ordered RFC numbers plus lightweight hit info. */
export const searchRfcs = async (input: SearchCaseInput): Promise<SearchResult> => {
  const { query, preset, refinements, perPage = DEFAULT_PER_PAGE } = input

  const parsed = await multiSearch({
    searches: [
      {
        collection: COLLECTION,
        q: query.length > 0 ? query : '*',
        preset,
        filter_by: buildFilterBy(refinements),
        per_page: perPage
      }
    ]
  })

  const result = parsed.results[0]!
  const hits: RfcHit[] = result.hits.map((hit) => ({
    rfcNumber: hit.document.rfcNumber,
    title: hit.document.title
  }))

  return {
    found: result.found,
    hits,
    rfcNumbers: hits.map((hit) => hit.rfcNumber)
  }
}

/** One cheap query used by the suite's preflight to fail fast on a dead/unreachable host. */
export const probeConnectivity = async (): Promise<void> => {
  await searchRfcs({ query: '*', preset: 'red', perPage: 1 })
}
