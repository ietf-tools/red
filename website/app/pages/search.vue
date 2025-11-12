<template>
  <div class="min-h-[100vh]">
    <SafeNoScript>This search requires JavaScript.</SafeNoScript>
    <ais-instant-search
      ref="aisInstantSearchRef"
      :index-name="INDEX_NAME"
      :search-client="searchClient"
      :future="{ preserveSharedStateOnUnmount: true }"
      :routing="routing"
    >
      <NuxtLayout name="default">
        <template #subheader>
          <div class="container mx-auto">
            <Heading
              level="1"
              class="mt-1 mb-1 md:mb-2 ml-2 text-balance"
            >
              Search RFCs
            </Heading>
            <div class="flex flex-row items-center pt-4 pb-6">
              <div class="w-full md:w-2/3">
                <ais-search-box
                  autofocus
                  placeholder="Find an RFC (number, subseries, title, author, etc.)"
                  :class-names="{
                    'ais-SearchBox-form': 'w-full flex',
                    'ais-SearchBox-input':
                      aisSearchboxInputClass,
                    'ais-SearchBox-submit':
                      'bg-blue-200 px-2 flex items-center rounded-r-xs',
                    'ais-SearchBox-reset': 'hidden',
                    'ais-SearchBox-loadingIndicator':
                      'bg-yellow-400 px-2 flex items-center text-white'
                  }"
                  show-loading-indicator
                >
                  <template #submit-icon>
                    <Icon
                      name="fluent:search-12-filled"
                      size="2em"
                    />
                  </template>
                  <template #loading-indicator>
                    <Icon
                      name="eos-icons:loading"
                      size="2em"
                    />
                    <div class="bg-red-500 w-5 h-5"></div>
                  </template>
                </ais-search-box>
              </div>
              <div class="hidden md:block pl-5 grow">
                <ClientOnly>
                  <SearchInRfcComments />
                  <template #fallback>
                    <div :class="[
                      aisSearchboxInputClass,
                      'invisible' // ie visibility:hidden so that it still takes up layout space
                    ]">
                      &nbsp;
                    </div>
                  </template>
                </ClientOnly>
              </div>
            </div>
          </div>
        </template>

        <div class="container mx-auto flex flex-row items-start py-5 lg:min-h-screen md:px-2">
          <ClientOnly>
            <template #fallback>
              <p class="w-full text-center">
                Loading search...
                <SafeNoScript>Please enable JavaScript to use search.</SafeNoScript>
              </p>
            </template>
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
                    class="bg-gray-400 data-[orientation=vertical]:h-7 data-[orientation=vertical]:w-px mx-3"
                  />
                  <SearchDensity v-model="searchStore.density" />
                </div>
                <div class="lg:hidden print:hidden">
                  <SearchMobileFilter />
                </div>
              </div>

              <SearchSubseriesBar
                v-if="searchStore.isSubseries"
                :label="searchStore.subseriesLabel"
                :href="searchStore.subseriesHref"
              />

              <ais-hits
                :id="INSTANTSEARCH_HITS_CONTAINER_DOM_ID"
                class="mt-4"
              >
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
import {
  AisInstantSearch,
  AisSearchBox,
  AisHits
} from 'vue-instantsearch/vue3/es'
import { Separator } from 'reka-ui'
// Packaging of default export of 'typesense-instantsearch-adapter' seems to confuse Nuxt so we'll import this directly
import TypesenseInstantSearchAdapter from 'typesense-instantsearch-adapter/src/TypesenseInstantsearchAdapter.js'
import { INSTANTSEARCH_HITS_CONTAINER_DOM_ID } from '../utilities/typesense'
import type { TypeSenseClient } from '../utilities/typesense'
import { adaptSearchClient } from '~/utilities/search-client-middleware'
import { useRfcEditorHead } from '~/utilities/head'
import { SEARCH_PATH, searchPathBuilder } from '~/utilities/url'

const route = useRoute()
const searchStore = useSearchStore()

const router = useRouter()

/**
 * Typesense Search Client
 */

const typesenseAdapter = new TypesenseInstantSearchAdapter({
  server: {
    apiKey: 'j2ZodfQTgoa4Vn5BCOdvKJe7fWmcqYhH', // Be sure to use an API key that only allows search operations
    nodes: [
      {
        host: 'typesense.ietf.org',
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
  },
})
const INDEX_NAME = 'docs'
const searchClient = adaptSearchClient(
  typesenseAdapter.searchClient as TypeSenseClient
)

const aisInstantSearchRef = useTemplateRef('aisInstantSearchRef')

/**
 * Switch search preset if toggling search in RFC contents option
 */
watch(
  () => searchStore.searchContents,
  (newValue) => {
    typesenseAdapter.configuration.additionalSearchParameters.preset =
      newValue ? 'red-content' : 'red'

    const value = aisInstantSearchRef.value
    if (isAisInstanceSearchValue(value)) {
      value.instantSearchInstance.helper.search()
    } else {
      console.error(`Unable to search, debug:`, {
        value: value,
        '!!value': !!value,
        keyInValue:
          value && typeof value === 'object' && 'instantSearchInstance' in value
      })
    }
  }
)

const isAisInstanceSearchValue = (
  value: unknown
): value is AisInstantSearch => {
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
      'flags.hiddenDefault': boolean
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

// AIS creates routes without a trailing slash
const searchWithoutTrailingSlash = SEARCH_PATH.replace(/\/$/, '')

const routing = {
  router: noOpRouter,
  stateMapping: {
    async stateToRoute(uiState: UIState): Promise<void> {
      if (
        // stateToRoute will be called even when leaving search to go to another route eg `/info/*`
        // so we shouldn't update the route if they're no longer on the search page
        !router.currentRoute.value.fullPath.startsWith(searchWithoutTrailingSlash)) {
        // console.info('leaving search page', router.currentRoute.value.fullPath, SEARCH_PATH)
        return
      }

      const q = uiState[INDEX_NAME].query ?? null
      const stream = uiState[INDEX_NAME].menu?.['stream.name'] ?? null
      const area = uiState[INDEX_NAME].menu?.['area.full'] ?? null
      const group = uiState[INDEX_NAME].refinementList?.['group.full']?.join(',') ?? null
      const authors = uiState[INDEX_NAME].refinementList?.['authors.name']?.join(',') ?? null
      const pubDate = uiState[INDEX_NAME].range?.['publicationDate'] ?? null
      const showObsoleted = !(uiState[INDEX_NAME].toggle?.['flags.hiddenDefault'] || false)
      const sort = uiState[INDEX_NAME].sortBy?.substring(10) ?? null

      // FIXME
      // When using the header nav to click on 'The RFC Series / Browse RFCs by Status / any link' the URL should have precedence over uiState
      // However when changing search filters then uiState should have precedence
      //
      // There is no current fix for this, however as a temporary workaround the HeaderNavData.ts has config to prefer conventional <a>
      // links rather than SPA links so that a full page refresh occurs which does make it behave correctly, albeit with slow full page
      // reloads. We should address this.

      const uiStateStatus = uiState[INDEX_NAME].refinementList?.['status.name']?.join(',')
      const status: string | null = uiStateStatus ?? null
      // TODO: don't navigateTo when the resulting URL would be the same as this creates unnecessary browser history
      await navigateTo(
        {
          query: {
            ...q && { q },
            ...status && { status },
            ...stream && { stream },
            ...area && { area },
            ...group && { group },
            ...authors && { authors },
            ...pubDate && { pubDate },
            ...showObsoleted && { showObsoleted: 1 },
            ...sort && { sort }
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
      const showObsoleted = route.query.showObsoleted === '1'
      const sortBy = route.query.sort?.toString() ?? ''
      return {
        [INDEX_NAME]: {
          query,
          range: {
            ...pubDate && { publicationDate: pubDate }
          },
          refinementList: {
            type: ['rfc'],
            ...status && { 'status.name': status as StatusName[] },
            ...group && { 'group.full': group },
            ...authors && { 'authors.name': authors }
          },
          menu: {
            ...stream && { 'stream.name': stream },
            ...area && { 'area.full': area }
          },
          ...sortBy && {
            sortBy: `docs/sort/${sortBy}`
          },
          toggle: {
            'flags.hiddenDefault': !showObsoleted
          }
        }
      }
    }
  }
}

const aisSearchboxInputClass = 'flex-1 min-w-0 bg-white text-black dark:bg-black dark:text-white dark:border-white dark:border pl-4 py-3 pr-2 h-12 rounded-l-xs'

definePageMeta({
  layout: false
})

useRfcEditorHead({
  title: 'Search',
  canonicalUrl: searchPathBuilder({}),
  description: 'Search RFCs by number, title, subseries, author, etc.',
  contentType: 'website'
})
</script>