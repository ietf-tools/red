import { createTypesenseSearchClient } from '~/components/searchv2/adapters/typesense'
import type { SearchClient, SearchRequest } from '~/components/searchv2'

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
    preset: (request) => (request.toggles.contents ? 'red-content' : 'red'),
    filterFor: (request) => {
      const clauses = ['type:=rfc']
      if (request.toggles['flags.hiddenDefault']) clauses.push('flags.hiddenDefault:=false')
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

  return { ...base, search }
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
