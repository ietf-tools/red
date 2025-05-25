<template>
  <div class="min-h-[100vh]">
    <ais-instant-search :index-name="indexName" :search-client="searchClient" :initial-ui-state="initialUiState" :future="{ preserveSharedStateOnUnmount: true }">
      <NuxtLayout name="default">
        <template #subheader>
          <div class="container mx-auto">
            <Heading level="1" class="w-full mt-0 mb-3 pl-5 md:p-0 text-balance">
              Search RFCs
            </Heading>
            <div class="lg:w-1/2">
              <ais-search-box
                autofocus
                placeholder="Find an RFC"
                :class-names="{
                  'ais-SearchBox-form': 'w-full flex pt-4 pb-6',
                  'ais-SearchBox-input': 'flex-1 bg-white text-black dark:bg-black dark:text-white dark:border-white dark:border pl-4 py-3 pr-2',
                  'ais-SearchBox-submit': 'bg-blue-200 px-2 flex items-center',
                  'ais-SearchBox-reset': 'hidden',
                  'ais-SearchBox-loadingIndicator': 'bg-yellow-400 px-2 flex items-center text-white'
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
                  <div class="text-sm w-max text-zinc-500"><span class="font-medium">{{ nbHits.toLocaleString('en', { useGrouping: true }) }}</span> hits in <span class="font-medium">{{ processingTimeMS }}ms</span></div>
                </template>
              </ais-stats>
              <div class="hidden lg:block">
                <label class="text-base">
                  <span>Sort by</span>
                  <ais-sort-by
                    :items="[
                      { value: 'docs', label: 'Relevancy' },
                      { value: 'docs/sort/rfcNumber:asc', label: 'RFC no. (Lowest first)' },
                      { value: 'docs/sort/rfcNumber:desc', label: 'RFC no. (Highest first)' }
                    ]"
                    :class-names="{
                      'ais-SortBy-select': 'text-base ml-2 bg-white text-black dark:bg-black dark:text-white dark:border'
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
                <ul>
                  <li v-for="item in items" :key="item.objectID" class="card bg-zinc-50 p-4 shadow-sm mb-2">
                    <div class="flex flex-row">
                      <h1 class="font-medium grow"><a :href="`/info/` + item.filename + `/`">{{ item.title }}</a></h1>
                      <span v-if="item.ref" class="text-sm font-medium text-rose-800">{{ item.ref.toUpperCase() }}</span>
                    </div>
                    <span class="text-sm font-medium text-gray-600 uppercase">{{ item.filename }}</span>
                    <span class="text-sm line-clamp-2 mt-2"><em>{{ item.abstract }}</em></span>
                    <div class="flex flex-row mt-2">
                      <div class="text-sm font-medium text-sky-700 grow">{{ item.authors?.map(a => a.name).join(', ') }}</div>
                      <div v-if="item.groupName" class="text-right">
                        <div class="text-sm text-orange-800">{{ item.groupName }}</div>
                        <div v-if="item.areaName" class="text-xs text-orange-800">{{ item.areaName }}</div>
                      </div>
                    </div>
                  </li>
                  <ais-pagination
                    :class-names="{
                      'ais-Pagination': 'w-full mt-4',
                      'ais-Pagination-list': 'flex flex-row justify-center',
                      'ais-Pagination-item': 'mr-1 py-2 px-3 bg-gray-200 rounded-xs',
                      'ais-Pagination-item--selected': 'bg-gray-700 text-white',
                      'ais-Pagination-item--disabled': 'bg-transparent text-gray-400'
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

const responsiveModeStore = useResponsiveModeStore()

const typesenseInstantsearchAdapter = new TypesenseInstantSearchAdapter({
  server: {
    apiKey: 'j2ZodfQTgoa4Vn5BCOdvKJe7fWmcqYhH', // Be sure to use an API key that only allows search operations
    nodes: [
      {
        host: 'typesense.ietf.org',
        path: '',
        port: 443,
        protocol: 'https',
      },
    ],
    cacheSearchResultsForSeconds: 2 * 60, // Cache search results from server. Defaults to 2 minutes. Set to 0 to disable caching.
  },
  // The following parameters are directly passed to Typesense's search API endpoint.
  //  So you can pass any parameters supported by the search endpoint below.
  //  query_by is required.
  additionalSearchParameters: {
    query_by: 'rfc,filename,title,abstract,keywords,authors,adName,group,groupName,area,areaName',
    infix: 'off,always,off,off,off,off,off,off,off,off,off',
    query_by_weights: '127,50,50,20,20,1,1,1,1,1,1'
  }
})
const indexName = 'docs'
const searchClient = typesenseInstantsearchAdapter.searchClient
const initialUiState = {
  docs: {
    refinementList: {
      type: ['rfc']
    }
  }
}

definePageMeta({
  layout: false
})
</script>
