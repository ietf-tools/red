<template>
  <div class="min-h-[100vh]">
    <ais-instant-search
      ref="aisInstantSearchRef"
      :index-name="INDEX_NAME"
      :search-client="searchClient"
      :future="{ preserveSharedStateOnUnmount: true }"
      :routing="routing">
      <NuxtLayout name="default" has-sub-header>
        <template #subheader>
          <SearchMainHeader ref="searchMainHeader" />
        </template>
        <div class="container mx-auto w-full" v-html="noScriptHtml"></div>
        <!-- <Breadcrumbs
          class="container mx-auto pl-4 pr-3"
          :breadcrumb-items="[{ url: '/', label: 'Home' }, { label: 'Search RFCs' }]"
        /> -->
        <div class="container mx-auto flex flex-row items-start py-5 pl-5 pr-3">
          <ClientOnly>
            <div class="hidden lg:w-1/3 lg:block">
              <SearchFilter />
            </div>
            <div class="w-full lg:w-2/3">
              <div class="flex flex-row justify-between items-center">
                <SearchStats />
                <div class="hidden lg:flex lg:items-center lg:h-10">
                  <SearchSortBy />
                  <Separator
                    orientation="vertical"
                    decorative
                    class="bg-gray-400 data-[orientation=vertical]:h-7 data-[orientation=vertical]:w-px mx-3" />
                  <SearchDensity v-model="searchStore.density" />
                </div>
                <div class="lg:hidden print:hidden">
                  <SearchMobileFilter />
                </div>
              </div>

              <SearchSubseriesBar
                v-if="searchStore.isSubseries"
                :label="searchStore.subseriesLabel"
                :href="searchStore.subseriesHref" />

              <ais-hits :id="INSTANTSEARCH_HITS_CONTAINER_DOM_ID" class="mt-4">
                <template #default="{ items }">
                  <!-- NO RESULTS -->
                  <SearchNoResults v-if="!items.length" />
                  <!-- RESULTS -->
                  <SearchResultList :items="items" />
                </template>
              </ais-hits>
              <SearchPagination />
            </div>
          </ClientOnly>
        </div>
      </NuxtLayout>
    </ais-instant-search>
  </div>
</template>

<script setup lang="ts">
import { AisInstantSearch, AisHits } from 'vue-instantsearch/vue3/es'
import type InstantSearch from 'instantsearch.js/es/lib/InstantSearch.js'
import { Separator } from 'reka-ui'
// Packaging of default export of 'typesense-instantsearch-adapter' seems to confuse Nuxt so we'll import this directly
import TypesenseInstantSearchAdapter from 'typesense-instantsearch-adapter/src/TypesenseInstantsearchAdapter.js'
import { INSTANTSEARCH_HITS_CONTAINER_DOM_ID } from '../utilities/typesense'
import type { TypeSenseClient } from '../utilities/typesense'
import { adaptSearchClient } from '~/utilities/search-client-middleware'
import { useRfcEditorHead } from '~/utilities/head'
import { API_NO_JS_SERVER_SEARCH_PATH, SEARCH_PATH, searchPathBuilder } from '~/utilities/url'
import {
  FLAGS_HIDDEN_DEFAULT_KEY,
  NOSCRIPT_IFRAME_DOM_ID,
  clearSearchQueryKey,
  resetHiddenDefaultKey
} from '~/utilities/search'
import { useFeatureFlags } from '~/utilities/feature-flags'

const route = useRoute()
const searchStore = useSearchStore()

const router = useRouter()

/**
 * Typesense Search Client
 */

const host = useTypesenseHost()
const apiKey = useTypesenseApiKey()

const typesenseAdapter = new TypesenseInstantSearchAdapter({
  server: {
    apiKey,
    nodes: [
      {
        host,
        path: '',
        port: 443,
        protocol: 'https'
      }
    ],
    cacheSearchResultsForSeconds: 2 * 60 // Cache search results from server. Defaults to 2 minutes. Set to 0 to disable caching.
  },
  // The following parameters are directly passed to Typesense's search API endpoint.
  //  So you can pass any parameters supported by the search endpoint below.
  //  query_by is required.
  additionalSearchParameters: {
    preset: searchStore.searchContents ? 'red-content' : 'red'
  }
})
const INDEX_NAME = 'docs'
const searchClient = adaptSearchClient(typesenseAdapter.searchClient as TypeSenseClient)

const aisInstantSearchRef = useTemplateRef('aisInstantSearchRef')
const searchMainHeaderRef = useTemplateRef('searchMainHeader')

const isSearchMainHeaderWithClearQuery = (value: unknown): value is { clearQuery: () => void } =>
  !!value && typeof value === 'object' && 'clearQuery' in value && typeof value.clearQuery === 'function'

provide(clearSearchQueryKey, () => {
  if (isSearchMainHeaderWithClearQuery(searchMainHeaderRef.value)) {
    searchMainHeaderRef.value.clearQuery()
  } else {
    console.warn('clearSearchQueryKey: SearchMainHeader clearQuery not available', searchMainHeaderRef.value)
  }
})

const resetHiddenDefault = () => {
  console.log('RESeT HIDDEN DEFAULT KEY')
  const value = aisInstantSearchRef.value
  if (isAisInstanceSearchValue(value)) {
    value.instantSearchInstance.setUiState((state) => {
      if (state[INDEX_NAME]?.toggle?.[FLAGS_HIDDEN_DEFAULT_KEY] === true) {
        return state
      }
      return {
        ...state,
        [INDEX_NAME]: {
          ...state[INDEX_NAME],
          toggle: {
            ...state[INDEX_NAME]?.toggle,
            [FLAGS_HIDDEN_DEFAULT_KEY]: !Boolean(featureFlags.value.searchObsoletedDefaults)
          }
        }
      }
    })

    const { showObsoleted: _showObsoleted, ...restQuery } = route.query
    router.replace({ query: restQuery })
  } else {
    console.warn('resetHiddenDefaultKey: AisInstantSearch instance not available', value)
  }
}

provide(resetHiddenDefaultKey, async () => {
  resetHiddenDefault()
  await nextTick()
  resetHiddenDefault()
})

/**
 * Switch search preset if toggling search in RFC contents option
 */
watch(
  () => searchStore.searchContents,
  (newValue) => {
    typesenseAdapter.configuration.additionalSearchParameters.preset = newValue ? 'red-content' : 'red'
    console.log('sdfsdf')
    const value = aisInstantSearchRef.value
    if (isAisInstanceSearchValue(value)) {
      value.instantSearchInstance.helper.search()
    } else {
      console.error(`Unable to search, debug:`, {
        value: value,
        '!!value': !!value,
        keyInValue: value && typeof value === 'object' && 'instantSearchInstance' in value
      })
    }
  }
)

const isAisInstanceSearchValue = (
  value: unknown
): value is { instantSearchInstance: InstanceType<typeof InstantSearch> } => {
  return !!(
    value &&
    typeof value === 'object' &&
    'instantSearchInstance' in value &&
    value.instantSearchInstance &&
    typeof value.instantSearchInstance === 'object' &&
    'helper' in value.instantSearchInstance
  )
}

/**
 * UI State
 */

type StatusName = 'Best Current Practice'

type UIState = {
  [key in typeof INDEX_NAME]: {
    query?: string
    range?: {
      publicationDate?: string // eg "-31752000:1748433600"
    }
    refinementList?: {
      type: string[]
      'status.name'?: StatusName[]
      'group.full'?: string[]
      'authors.name'?: string[]
    }
    menu?: {
      'stream.name'?: string
      'area.full'?: string
    }
    sortBy?: string
    toggle?: {
      [FLAGS_HIDDEN_DEFAULT_KEY]: boolean
    }
  }
}

/**
 * A 'no op' router
 */
const noOpRouter = {
  write(..._args: unknown[]) {
    // console.log('write', { args })
  },
  read(..._args: unknown[]) {
    // console.log('read', { args })
  },
  onUpdate(..._args: unknown[]) {
    // console.log('onUpdate', { args })
  },
  dispose(..._args: unknown[]) {
    // console.log('dispose', { args })
  },
  createURL(..._args: unknown[]) {
    // console.log('createURL', { args })
  }
}

const featureFlags = useFeatureFlags()

watch(
  () => featureFlags.value.searchObsoletedDefaults,
  () => {
    const searchObsoletedDefault = Boolean(featureFlags.value.searchObsoletedDefaults)
    const value = aisInstantSearchRef.value
    if (!isAisInstanceSearchValue(value)) {
      console.warn('resetHiddenDefaultKey: AisInstantSearch instance not available', value)
      return
    }
    const setter = () => {
      if (!value.instantSearchInstance.started) {
        console.log('try setting default soon')
        setTimeout(setter, 50)
        return
      }
      console.log('setting default')
      value.instantSearchInstance.setUiState((state) => {
        return {
          ...state,
          [INDEX_NAME]: {
            ...state[INDEX_NAME],
            toggle: {
              ...state[INDEX_NAME]?.toggle,
              [FLAGS_HIDDEN_DEFAULT_KEY]: !searchObsoletedDefault
            }
          }
        }
      })
    }

    setTimeout(setter, 10)
  }
)

// AIS creates routes without a trailing slash
const searchWithoutTrailingSlash = SEARCH_PATH.replace(/\/$/, '')

const routing = {
  router: noOpRouter,
  stateMapping: {
    async stateToRoute(uiState: UIState): Promise<void> {
      if (
        // stateToRoute will be called even when leaving search to go to another route eg `/info/*`
        // so we shouldn't update the route if they're no longer on the search page
        !router.currentRoute.value.fullPath.startsWith(searchWithoutTrailingSlash)
      ) {
        // console.info('leaving search page', router.currentRoute.value.fullPath, SEARCH_PATH)
        return
      }

      const q = uiState[INDEX_NAME].query ?? null
      const stream = uiState[INDEX_NAME].menu?.['stream.name'] ?? null
      const area = uiState[INDEX_NAME].menu?.['area.full'] ?? null
      const group = uiState[INDEX_NAME].refinementList?.['group.full']?.join(',') ?? null
      const authors = uiState[INDEX_NAME].refinementList?.['authors.name']?.join(',') ?? null
      const pubDate = uiState[INDEX_NAME].range?.['publicationDate'] ?? null
      const showObsoleted = !(
        uiState[INDEX_NAME].toggle?.[FLAGS_HIDDEN_DEFAULT_KEY] ?? !Boolean(featureFlags.value.searchObsoletedDefaults)
      )
      const sort = uiState[INDEX_NAME].sortBy?.substring(10) ?? null

      // The nav menu had links to searchs with specific filters (ie links to this route with params).
      // This would often break in Nuxt SPA mode (typesense pushes its internal state to the URL and doesn't seem to adapt
      // to URL param changes), so to work around this bug the nav links to the search were were non-SPA conventional links.
      // The state management of how we use typesense and introduce new filters etc probably needs reviewing/refactoring.

      const uiStateStatus = uiState[INDEX_NAME].refinementList?.['status.name']?.join(',')
      const status: string | null = uiStateStatus ?? null
      // TODO: don't navigateTo when the resulting URL would be the same as this creates unnecessary browser history
      await navigateTo(
        {
          query: {
            ...(q && { q }),
            ...(status && { status }),
            ...(stream && { stream }),
            ...(area && { area }),
            ...(group && { group }),
            ...(authors && { authors }),
            ...(pubDate && { pubDate }),
            ...(showObsoleted && { showObsoleted: 1 }),
            ...(sort && { sort })
          }
        },
        { replace: true }
      )
    },
    routeToState(_routeState: unknown): UIState {
      // console.log("new route", _routeState, route.query)
      // TODO: should we parse/validate any of these params?
      const query = route.query.q?.toString() ?? ''
      const status = route.query.status?.toString().split(',')
      const stream = route.query.stream?.toString() ?? ''
      const area = route.query.area?.toString() ?? ''
      const group = route.query.group?.toString().split(',')
      const authors = route.query.authors?.toString().split(',')
      const pubDate = route.query.pubDate?.toString() ?? ''
      const showObsoleted = route.query.showObsoleted
        ? route.query.showObsoleted === '1'
        : Boolean(featureFlags.value.searchObsoletedDefaults)
      const sortBy = route.query.sort?.toString() ?? ''
      return {
        [INDEX_NAME]: {
          query,
          range: {
            ...(pubDate && { publicationDate: pubDate })
          },
          refinementList: {
            type: ['rfc'],
            ...(status && { 'status.name': status as StatusName[] }),
            ...(group && { 'group.full': group }),
            ...(authors && { 'authors.name': authors })
          },
          menu: {
            ...(stream && { 'stream.name': stream }),
            ...(area && { 'area.full': area })
          },
          ...(sortBy && {
            sortBy: `docs/sort/${sortBy}`
          }),
          toggle: {
            [FLAGS_HIDDEN_DEFAULT_KEY]: !showObsoleted
          }
        }
      }
    }
  }
}

const noScriptHtml = computed(() => {
  return `<noscript data-nosnippet><iframe name="${NOSCRIPT_IFRAME_DOM_ID}" sandbox="allow-top-navigation-by-user-activation" title="Search results..." src="${API_NO_JS_SERVER_SEARCH_PATH}?x-typesense-api-key=${apiKey}" style="width:100%;height:90vh;overflow-y:scroll"></iframe></noscript>`
})

definePageMeta({
  layout: false
})

// The canonical path should not include the various search queries and filters etc.
// For the purposes of search engines recommended website entry point (which is all
// a canonical URL is) it should be a default search.
const canonicalPath = searchPathBuilder({})

useRfcEditorHead({
  title: 'Search',
  canonicalPath,
  description: 'Search RFCs by number, title, subseries, author, etc.',
  contentType: 'website'
})
</script>
