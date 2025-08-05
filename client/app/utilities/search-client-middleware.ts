import type { TypeSenseClient } from "./typesense"

export function adaptSearchClient(searchClient: TypeSenseClient): TypeSenseClient {
  const searchStore = useSearchStore()

  return {
  ...searchClient,
  search: async (searchRequests) => {
    let isSubseries = false

    const resp = await searchClient.search(searchRequests.map(r => {
      // ------------------------------------------
      // OVERRIDES
      // ------------------------------------------
      // RFC Number query
      const rfcMatch = r.params?.query.match(/^rfc[ :=]{0,3}(?<num>[0-9]+)\s?$/i)
      if (rfcMatch?.groups?.num) {
        if (!r.params.facetFilters) {
          r.params.facetFilters = []
        }
        r.params.facetFilters.push(`rfc:${rfcMatch.groups.num}`)
        r.params.query = '*'

        return r
      }

      // Subseries query (BCP, STD, FYI)
      const subseriesMatch = r.params?.query.match(/^(?<subseries>bcp|std|fyi)[ :=]{0,3}(?<num>[0-9]+)\s?$/i)
      if (subseriesMatch?.groups?.num) {
        if (!r.params.facetFilters) {
          r.params.facetFilters = []
        }
        r.params.facetFilters.push(`subseries.${subseriesMatch.groups.subseries.toLowerCase()}:${subseriesMatch.groups.num}`)
        r.params.query = '*'

        isSubseries = true
        searchStore.subseriesLabel = `${subseriesMatch.groups.subseries.toUpperCase()} ${subseriesMatch.groups.num}`
        searchStore.subseriesHref = `/info/${subseriesMatch.groups.subseries.toLowerCase()}${subseriesMatch.groups.num}`
      } else {
        isSubseries = false
      }

      return r
    }))

    // Set series only if there're results
    searchStore.isSubseries = Boolean(isSubseries && resp.results?.[0].nbHits > 0)

    return resp
  }
}
}