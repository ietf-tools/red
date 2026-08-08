import { assertIsString } from '~/utilities/typescript'
import type { Density } from '~/utilities/typesense'

/**
 * Stores UI state that lives outside the search engine's own state (query, facets, pagination, etc.).
 *
 * - density: user preference persisted to localStorage
 * - isSubseries / subseriesLabel / subseriesHref: derived from search results by
 *   searchv2-rfc-client, written by RFCSearch and consumed by SearchSubseriesBar
 */
export const useSearchStore = defineStore('searchStore', {
  state: () => ({
    density: 'full' as Density,
    isSubseries: false,
    subseriesLabel: '',
    subseriesHref: ''
  }),
  persist: {
    pick: ['density']
  }
})

export const useTypesenseHost = () => {
  const runtimeConfig = useRuntimeConfig()
  const { typesenseHost } = runtimeConfig.public
  assertIsString(typesenseHost)
  if (typesenseHost.length === 0) {
    throw Error('Expected NUXT_PUBLIC_TYPESENSE_HOST to have length > 0.')
  }
  return typesenseHost
}

export const useTypesenseApiKey = () => {
  const runtimeConfig = useRuntimeConfig()
  const { typesenseApiKey } = runtimeConfig.public
  assertIsString(typesenseApiKey)
  if (typesenseApiKey.length === 0) {
    throw Error('Expected NUXT_PUBLIC_TYPESENSE_API_KEY to have length > 0.')
  }
  return typesenseApiKey
}
