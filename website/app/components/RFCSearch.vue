<template>
  <NuxtLayout name="default">
    <div class="min-h-[100vh]">
      <div class="container mx-auto pl-2">
        <Breadcrumbs v-if="breadcrumbItems && Array.isArray(breadcrumbItems)" :breadcrumb-items="breadcrumbItems" />
      </div>

      <SearchRoot
        :search-client="searchClient"
        :state-adapter="stateAdapter"
        :persistent-facets="PERSISTENT_FACETS"
        :default-hits-per-page="10"
        :stalled-search-delay-ms="800"
        :default-ui-state="defaultUiState">
        <Heading
          level="1"
          class="search-container mx-auto pl-5 pr-3 py-1 text-blue-900 dark:text-gray-200 text-balance">
          Search
        </Heading>

        <!-- Single `search` landmark for the whole facility (query + filters + results).
             SearchBox's own landmark is disabled below so there is exactly one. -->
        <div role="search" aria-label="RFC search">
          <div
            :class="`search-container ${
              '' // remember this noscript container is rendered for JS browsers too, so you should probably not apply vertical margins/padding
            } mx-auto px-6`"
            v-html="noScriptFormHtml" />

          <ClientOnly>
            <div
              :id="SEARCHV2_STICKY_CONTAINER_DOM_ID"
              class="lg:sticky lg:top-0 lg:z-110 bg-gray-200 dark:bg-blue-950">
              <div class="search-container mx-auto pl-5 pr-3 pt-1 pb-0 py-2 xl:py-2 flex flex-row items-center">
                <div class="w-full flex justify-center mx-auto">
                  <SearchBox
                    :class-names="searchBoxClasses"
                    label="Search RFCs"
                    :description-id="searchBoxDescriptionId"
                    submit-label="Submit search"
                    :landmark="false">
                    <template #submit-icon>
                      <GraphicsSearch class="w-[2em] h-[2em]" />
                    </template>
                  </SearchBox>
                </div>
              </div>
            </div>
            <div class="pb-2 italic bg-gray-200 dark:bg-blue-950" :id="searchBoxDescriptionId">
              <div class="search-container mx-auto px-2 text-center md:text-left md:px-0">
                <p class="xl:-mt-[0.3em] pl-4 md:pl-34 2xl:pl-67 text-black dark:text-white">
                  Find an RFC (number, subseries, title, author, etc.)
                </p>
              </div>
            </div>
          </ClientOnly>

          <div class="search-container mx-auto w-full" v-html="noScriptIframeHtml" />

          <div class="search-container mx-auto py-5 pl-5 pr-3 flex flex-row items-start">
            <ClientOnly>
              <nav aria-label="search filters" class="hidden lg:block lg:w-1/3 pr-6">
                <RFCSearchFilters @reset="focusFilterHeading" />
              </nav>

              <div class="w-full lg:w-2/3 lg:max-w-[50em]">
                <h2 class="sr-only">Search results</h2>
                <div class="flex w-full flex-row justify-between items-center gap-3 lg:gap-4 xl:gap-5">
                  <Stats :class-names="{ root: 'text-base font-bold whitespace-nowrap' }" />
                  <div class="hidden lg:flex lg:items-center gap-3">
                    <SortBy :items="SORT_ITEMS" label="Sort by" :class-names="sortClasses" />
                    <Separator
                      orientation="vertical"
                      decorative
                      class="bg-gray-400 data-[orientation=vertical]:h-7 data-[orientation=vertical]:w-px" />

                    <SearchDensity v-model="searchStore.density" />
                  </div>
                </div>

                <!-- Mobile controls: sort near the results summary + a dialog trigger for filters -->
                <div class="flex flex-row justify-between lg:hidden items-left gap-3 mt-3">
                  <button
                    type="button"
                    aria-haspopup="dialog"
                    class="flex items-center gap-1 border border-gray-400 rounded-xs px-3 py-2 text-base whitespace-nowrap cursor-pointer"
                    @click="openFilters">
                    <span class="hidden sm:inline-block">
                      <GraphicsFilterFilled class="size-[1.2em]" />
                    </span>
                    Filter RFCs
                  </button>

                  <SortBy :items="SORT_ITEMS" label="Sort by" :class-names="sortClasses" />
                </div>
                <div class="lg:hidden pt-2 flex flex-row justify-end w-full">
                  <SearchDensity v-model="searchStore.density" />
                </div>

                <SearchSubseriesBar
                  v-if="searchStore.isSubseries"
                  :label="searchStore.subseriesLabel"
                  :href="searchStore.subseriesHref" />

                <RFCSearchResults
                  class="mt-4"
                  :pending-focus="pendingResultFocus"
                  @focused="pendingResultFocus = false" />

                <Pagination :class-names="paginationClasses" :on-navigate="onPaginate" />

                <div class="mt-4 flex justify-center lg:justify-end">
                  <HitsPerPage :items="PER_PAGE_ITEMS" :class-names="hitsPerPageClasses" />
                </div>
              </div>

              <!-- Mobile filter dialog: native <dialog> so the browser traps focus and
                 restores it to the trigger on close. -->
              <dialog
                ref="filterDialogRef"
                aria-labelledby="rfc-filter-dialog-title"
                class="fixed top-0 left-0 w-screen h-screen max-h-screen p-0 rounded-xs bg-white dark:bg-black text-blue-900 dark:text-gray-200 backdrop:bg-black/50"
                @click="onDialogClick">
                <div class="w-full h-full flex flex-col">
                  <div
                    class="sticky z-10 flex items-center justify-between border-b border-gray-300 dark:border-gray-700 px-4 py-3 top-0 bg-white dark:bg-black">
                    <h1 id="rfc-filter-dialog-title" ref="dialogHeadingRef" tabindex="-1" class="text-lg font-semibold">
                      Filter RFCs
                    </h1>
                    <button type="button" aria-label="Close filters" class="p-1 cursor-pointer" @click="closeFilters">
                      <GraphicsDismiss class="size-[1.5em]" />
                    </button>
                  </div>
                  <div class="p-4 flex-1 overflow-y-auto overscroll-contain">
                    <RFCSearchFilters @reset="focusDialogHeading" />
                  </div>
                </div>
              </dialog>
            </ClientOnly>
          </div>
        </div>
      </SearchRoot>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { Separator } from 'reka-ui'
import {
  SearchRoot,
  SearchBox,
  Stats,
  SortBy,
  HitsPerPage,
  Pagination,
  type ClassNames,
  type UiState
} from '~/components/searchv2'
import { createRfcSearchClient } from '~/utilities/searchv2-rfc-client'
import { useNuxtStateAdapter } from '~/utilities/searchv2-nuxt-adapter'
import { SEARCHV2_STICKY_CONTAINER_DOM_ID, scrollUpToNewSearchResults } from '~/utilities/typesense'
import { NOSCRIPT_IFRAME_DOM_ID } from '~/utilities/search'
import { API_NO_JS_SERVER_SEARCH_PATH } from '~/utilities/url'
import type { BreadcrumbItem } from './BreadcrumbsTypes'
import { TAILWIND_SELECT_ARROW_PADDING_RIGHT } from '~/utilities/html'

const defaultUiState: UiState = {
  toggles: { searchObsoleted: true, searchMetadataOnly: false }
}

const searchStore = useSearchStore()
const host = useTypesenseHost()
const apiKey = useTypesenseApiKey()

const searchBoxDescriptionId = useId()

const searchClient = createRfcSearchClient({
  host,
  apiKey,
  onSubseries: (info) => {
    searchStore.isSubseries = info.isSubseries
    searchStore.subseriesLabel = info.label
    searchStore.subseriesHref = info.href
  }
})

const stateAdapter = useNuxtStateAdapter(defaultUiState)

// Stream and area are filtered on their stable identifiers; the display-name facets are here
// too because they supply the labels for those controls (see RFCSearchFilters).
const PERSISTENT_FACETS = [
  'status.name',
  'stream.slug',
  'stream.name',
  'area.acronym',
  'area.full',
  'group.full',
  'authors.name',
  'publicationDate'
]

const SORT_ITEMS = [
  { label: 'Relevance', value: '' },
  { label: 'Newest first', value: 'publicationDate:desc' },
  { label: 'Oldest first', value: 'publicationDate:asc' },
  { label: 'RFC number (ascending)', value: 'rfcNumber:asc' },
  { label: 'RFC number (descending)', value: 'rfcNumber:desc' }
]

const PER_PAGE_ITEMS = [
  { label: '10 per page', value: 10, default: true },
  { label: '25 per page', value: 25 },
  { label: '50 per page', value: 50 },
  { label: '100 per page', value: 100 }
]

const filterHeadingRef = ref<HTMLElement | null>(null)
const pendingResultFocus = ref(false)

// G4: flag the pending focus move; RfcSearchResults performs it once new results render.
const onPaginate = () => {
  scrollUpToNewSearchResults()
  pendingResultFocus.value = true
}

// D2: after a reset, move focus to the (stable) filter panel heading so it is not lost.
const focusFilterHeading = async () => {
  await nextTick()
  filterHeadingRef.value?.focus()
}

// Mobile filter dialog. Native <dialog>: the browser traps focus while open and
// restores focus to the trigger on close (H3). Escape-to-close is also native.
const filterDialogRef = ref<HTMLDialogElement | null>(null)
const dialogHeadingRef = ref<HTMLElement | null>(null)
const openFilters = () => filterDialogRef.value?.showModal()
const closeFilters = () => filterDialogRef.value?.close()
const focusDialogHeading = async () => {
  await nextTick()
  dialogHeadingRef.value?.focus()
}
const onDialogClick = (event: MouseEvent) => {
  // Close when the backdrop (the dialog element itself) is clicked.
  if (event.target === filterDialogRef.value) closeFilters()
}

const searchBoxClasses: ClassNames = {
  root: 'w-full 2xl:ml-32',
  row1: 'flex flex-col sm:flex-row sm:gap-2 items-center mx-auto',
  inputAndButtons: 'flex w-full',
  input:
    'flex-1 w-full min-w-0 max-w-192 text-black dark:text-white bg-white dark:bg-black dark:text-white border-1 border-gray-400 pl-4 py-3 pr-2 h-12 rounded-l-md',
  submit:
    'forced-color-adjust-none bg-blue-200 px-2 flex items-center rounded-r-md cursor-pointer text-white border-1 border-gray-400',
  reset: 'hidden cursor-pointer',
  label: 'text-blue-950 dark:text-white text-lg md:w-30 font-bold whitespace-nowrap',
  loadingIndicator: 'pl-0 sm:pl-2 text-black dark:text-white'
}

const sortClasses: ClassNames = {
  root: 'flex items-center gap-2 text-base',
  label: 'whitespace-nowrap',
  select: `py-2 pl-4 w-full min-w-0 max-w-full text-base bg-white dark:bg-black dark:text-white border border-gray-400 rounded-xs cursor-pointer ${TAILWIND_SELECT_ARROW_PADDING_RIGHT}`
}
const hitsPerPageClasses: ClassNames = {
  root: 'flex items-center gap-2 text-base',
  select: `py-2 px-2 bg-white dark:bg-black dark:text-white border border-gray-400 rounded-xs cursor-pointer ${TAILWIND_SELECT_ARROW_PADDING_RIGHT}`
}
const paginationClasses: ClassNames = {
  root: 'flex justify-center mt-8',
  list: 'flex flex-row flex-wrap justify-center gap-1',
  link: 'cursor-pointer py-2 px-3 block no-underline hover:underline focus:underline bg-gray-200 dark:bg-gray-900 rounded-xs',
  linkSelected: 'bg-gray-700 text-white dark:bg-blue-200! dark:text-black'
}

const noScriptFormHtml = computed(
  () => `<noscript data-nosnippet>
    <div style="background-color:#ffc9c9;color:#9f0712;padding:7px;">
      <b>Your browser has JavaScript disabled.</b> The following free text search is available, but please enable JavaScript for more search features.
    </div>
    <form method="get" action="${API_NO_JS_SERVER_SEARCH_PATH}" target="${NOSCRIPT_IFRAME_DOM_ID}" class="flex flex-row pt-6 pb-2">
      <input id="search" aria-label="Search by text" type="search" name="q" autocomplete="search" class="min-w-0 w-full border-1 border-black bg-white text-black pl-4 py-3" />
      <input type="hidden" name="x-typesense-api-key" value="${apiKey}" />
      <button type="submit" class="bg-blue-100 px-2 flex items-center text-blue-950 cursor-pointer font-bold" aria-label="Submit search">Search</button>
    </form>
  </noscript>`
)

const noScriptIframeHtml = computed(
  () =>
    `<noscript data-nosnippet><iframe name="${NOSCRIPT_IFRAME_DOM_ID}" sandbox="allow-top-navigation-by-user-activation" title="Search results" src="${API_NO_JS_SERVER_SEARCH_PATH}?x-typesense-api-key=${apiKey}" style="width:100%;height:90vh;overflow-y:scroll"></iframe></noscript>`
)

const breadcrumbItems = computed((): BreadcrumbItem[] => [
  { url: '/', label: 'Home' },
  { url: undefined, label: 'Search' }
])
</script>
