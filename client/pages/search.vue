<template>
  <div class="min-h-[100vh]">
    <ais-instant-search
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
              class="w-full mt-0 mb-3 pl-5 md:p-0 text-balance"
            >
              Search RFCs
            </Heading>
            <div class="lg:w-1/2">
              <ais-search-box
                autofocus
                placeholder="Find an RFC"
                :class-names="{
                  'ais-SearchBox-form': 'w-full flex pt-4 pb-6',
                  'ais-SearchBox-input':
                    'flex-1 bg-white text-black dark:bg-black dark:text-white dark:border-white dark:border pl-4 py-3 pr-2',
                  'ais-SearchBox-submit': 'bg-blue-200 px-2 flex items-center',
                  'ais-SearchBox-reset': 'hidden',
                  'ais-SearchBox-loadingIndicator':
                    'bg-yellow-400 px-2 flex items-center text-white'
                }"
                show-loading-indicator
              >
                <template #submit-icon>
                  <Icon name="fluent:search-12-filled" size="2em" />
                </template>
                <template #loading-indicator>
                  <Icon name="eos-icons:loading" size="2em" />
                </template>
              </ais-search-box>
            </div>
          </div>
        </template>

        <div class="container mx-auto flex flex-row items-start py-5">
          <div class="hidden lg:w-1/3 lg:block">
            <SearchFilter />
          </div>
          <div class="w-full lg:w-2/3">
            <div class="flex flex-row justify-between items-center">
              <ais-stats>
                <template #default="{ nbHits, processingTimeMS }">
                  <div class="text-sm w-max text-zinc-500">
                    <span class="font-medium">{{
                      nbHits.toLocaleString('en', { useGrouping: true })
                    }}</span>
                    hits in
                    <span class="font-medium">{{ processingTimeMS }}ms</span>
                  </div>
                </template>
              </ais-stats>
              <div class="hidden lg:block">
                <label class="text-base">
                  <span>Sort by</span>
                  <ais-sort-by
                    :items="[
                      { value: 'docs', label: 'Relevancy' },
                      {
                        value: 'docs/sort/rfcNumber:asc',
                        label: 'RFC no. (Lowest first)'
                      },
                      {
                        value: 'docs/sort/rfcNumber:desc',
                        label: 'RFC no. (Highest first)'
                      }
                    ]"
                    :class-names="{
                      'ais-SortBy-select':
                        'text-base ml-2 bg-white text-black dark:bg-black dark:text-white dark:border'
                    }"
                  />
                </label>
              </div>
              <div class="lg:hidden print:hidden">
                <SearchMobileFilter />
              </div>
            </div>

            <ais-hits class="mt-4">
              <template #default="{ items }">
                <ul class="flex flex-col gap-4">
                  <li
                    v-for="item in items as TypeSenseSearchItem[]"
                    :key="item.objectID"
                    class="flex flex-col"
                  >
                    <RFCCardTypeSenseItem
                      heading-level="3"
                      :type-sense-search-item="item"
                    />
                  </li>
                  <ais-pagination
                    :class-names="{
                      'ais-Pagination': 'w-full mt-4',
                      'ais-Pagination-list': 'flex flex-row justify-center',
                      'ais-Pagination-item':
                        'mr-1 py-2 px-3 bg-gray-200 dark:bg-gray-900 rounded-xs',
                      'ais-Pagination-item--selected':
                        'bg-gray-700 dark:bg-blue-200! text-white',
                      'ais-Pagination-item--disabled':
                        'bg-transparent dark:bg-transparent text-gray-400 dark:text-gray-800'
                    }"
                  />
                </ul>
              </template>
            </ais-hits>
          </div>
        </div>
      </NuxtLayout>
    </ais-instant-search>
  </div>
</template>

<script setup lang="ts">
import {
  AisInstantSearch,
  AisSearchBox,
  AisStats,
  AisHits,
  AisPagination,
  AisSortBy
} from 'vue-instantsearch/vue3/es'
import TypesenseInstantSearchAdapter from 'typesense-instantsearch-adapter'
import type { TypeSenseSearchItem } from '../utilities/typesense'
import RFCCardTypeSenseItem from '~/components/RFCCardTypeSenseItem.vue'
import type { SearchParams } from '~/utilities/url'

const route = useRoute()

// Packaging of default export of 'typesense-instantsearch-adapter' seems to confuse Nuxt
// so this workaround ensures we have the Class
const tiSA = (
  'default' in TypesenseInstantSearchAdapter ?
    TypesenseInstantSearchAdapter.default
  : TypesenseInstantSearchAdapter) as typeof TypesenseInstantSearchAdapter

const typesenseAdapter = new tiSA({
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
    preset: 'red'
  }
})
const INDEX_NAME = 'docs'
const searchClient = typesenseAdapter.searchClient

type StdLevelName = 'Best Current Practice'

type UIState = {
  [key in typeof INDEX_NAME]: {
    query?: string
    range: {
      publicationDate: string // eg "-31752000:1748433600"
    }
    refinementList?: {
      type: string[]
      stdlevelname?: StdLevelName[]
    }
  }
}

/**
 * A 'no op' router
 */
const noOpRouter = {
  write(...args: unknown[]) {
    console.log('write', { args })
  },
  read(...args: unknown[]) {
    console.log('read', { args })
  },
  onUpdate(...args: unknown[]) {
    console.log('onUpdate', { args })
  },
  dispose(...args: unknown[]) {
    console.log('dispose', { args })
  },
  createURL(...args: unknown[]) {
    console.log('createURL', { args })
  }
}

const routing = {
  router: noOpRouter,
  stateMapping: {
    stateToRoute(uiState: UIState): void {
      const q = uiState[INDEX_NAME].query ?? null
      const stdlevelname =
        uiState[INDEX_NAME].refinementList?.stdlevelname?.join(',') ?? null
      // const sortby = uiState[INDEX_NAME].sortby ?? null
      // const status = uiState[INDEX_NAME].status?.join(',') ?? null
      // TODO: don't navigateTo when the resulting URL would be the same
      navigateTo(
        {
          query: {
            q,
            stdlevelname,

            status
          } satisfies Partial<SearchParams>
        },
        { replace: true }
      )
    },
    routeToState(routeState: unknown): UIState {
      console.log('routeToState', routeState)
      const query = route.query.q?.toString() ?? ''
      const stdlevelname = route.query.stdlevelname?.toString().split(',')
      // const status = route.query.status?.toString().split(',')
      return {
        [INDEX_NAME]: {
          query,
          range: {
            publicationDate: '-31752000:1748433600'
          },
          refinementList: {
            type: ['rfc'],
            stdlevelname: stdlevelname as StdLevelName[]
          }
        }
      }
    }
  }
}

definePageMeta({
  layout: false
})
</script>
