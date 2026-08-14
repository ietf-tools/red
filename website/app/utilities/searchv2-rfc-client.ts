import { createTypesenseSearchClient } from '~/components/searchv2/adapters/typesense'
import type { SearchClient, SearchForFacetValuesRequest, SearchRequest } from '~/components/searchv2'

export type RfcSubseriesInfo = {
  isSubseries: boolean
  label: string
  href: string
}

type CreateRfcSearchClientParams = {
  host: string
  apiKey: string
  onSubseries: (info: RfcSubseriesInfo) => void
}

/**
 * RFC Editor specific SearchClient. Wraps the generic Typesense adapter with the
 * `type:=rfc` constraint, the red/red-content preset swap, and the RFC-number and
 * subseries query rewrites (ported from the old search-client-middleware).
 */
export function createRfcSearchClient(params: CreateRfcSearchClientParams): SearchClient {
  const { host, apiKey, onSubseries } = params

  const base = createTypesenseSearchClient({
    host,
    apiKey,
    collection: 'docs',
    // Matches the authors filter's show-more-limit so the main facet response can populate the
    // full expanded list; also governs when `facetTruncated` fires for capped facets.
    maxFacetValues: 50,
    // `searchMetadataOnly` is off by default (search full RFC text via the `red-content` preset);
    // when the user opts in we narrow to metadata + abstract only via the `red` preset.
    preset: (request) => (request.toggles.searchMetadataOnly ? 'red' : 'red-content'),
    filterFor: (request) => {
      const clauses = ['type:=rfc']
      // `searchObsoleted` is on by default (include everything); when the user turns it off we
      // constrain to docs not hidden-by-default, i.e. excluding obsoleted/historic RFCs.
      if (!request.toggles.searchObsoleted) clauses.push('flags.hiddenDefault:=false')
      return clauses
    }
  })

  const search = async (request: SearchRequest) => {
    const { request: rewritten, subseries } = rewriteQuery(request)
    const response = await base.search(rewritten)
    onSubseries(
      subseries
        ? { isSubseries: response.nbHits > 0, label: subseries.label, href: subseries.href }
        : { isSubseries: false, label: '', href: '' }
    )
    return response
  }

  // Facet values are scoped to the current search, so they have to be scoped to the *rewritten*
  // one: with `rfc 2119` typed, the main results are the rfc:=2119 refinement, and offering
  // facet values for a literal `rfc 2119` text search would describe a different result set.
  const searchForFacetValues = async (request: SearchForFacetValuesRequest) => {
    if (!base.searchForFacetValues) return []
    const { search } = request
    return base.searchForFacetValues(search ? { ...request, search: rewriteQuery(search).request } : request)
  }

  return { ...base, search, searchForFacetValues }
}

type Rewrite = {
  request: SearchRequest
  subseries?: { label: string; href: string }
}

function rewriteQuery(request: SearchRequest): Rewrite {
  const { query } = request

  const rfcMatch = query.match(/^rfc[ :=]{0,3}(?<num>[0-9]+)\s?$/i)
  if (rfcMatch?.groups?.num) {
    return {
      request: { ...request, query: '', refinements: { ...request.refinements, rfc: [rfcMatch.groups.num] } }
    }
  }

  const subseriesMatch = query.match(/^(?<acronym>bcp|std|fyi)[ :=]{0,3}(?<num>[0-9]+)\s?$/i)
  if (subseriesMatch?.groups?.num && subseriesMatch.groups.acronym) {
    const acronym = subseriesMatch.groups.acronym.toLowerCase()
    const num = subseriesMatch.groups.num
    return {
      request: {
        ...request,
        query: '',
        refinements: {
          ...request.refinements,
          'subseries.acronym': [acronym],
          'subseries.number': [num]
        }
      },
      subseries: { label: `${acronym.toUpperCase()} ${num}`, href: `/info/${acronym}${num}` }
    }
  }

  return { request }
}
