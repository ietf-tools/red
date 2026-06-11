<template>
  <div class="flex flex-col items-center md:justify-center md:flex-row mt-8">
    <HorizontalScrollable class="w-full" inner-class="py-1">
      <ais-pagination @click="scrollUpToNewSearchResults">
        <template
          #default="{
            currentRefinement,
            nbPages,
            pages,
            isFirstPage,
            isLastPage,
            refine,
            // createURL,
            classNames
          }">
          <div class="w-full md:w-auto">
            {{ classNames }}
            <ul class="w-auto ml-auto mr-auto flex flex-row justify-center md:justify-left">
              <li v-if="!isFirstPage" class="mr-1 bg-gray-200 dark:bg-gray-900 rounded-xs">
                <button
                  type="button"
                  aria-label="Go to start of search results"
                  :class="{
                    'cursor-pointer py-2 px-3 block no-underline hover:underline focus:underline ': true,
                    'bg-gray-700 dark:bg-blue-200! text-white': isFirstPage,
                    'mr-1 bg-gray-200 dark:bg-gray-900 rounded-xs': !isFirstPage
                  }"
                  @click.prevent="refine(0)">
                  ‹‹
                </button>
              </li>
              <li v-if="!isFirstPage">
                <button
                  type="button"
                  aria-label="Go back a page of search results"
                  :class="{
                    'cursor-pointer py-2 px-3 block no-underline hover:underline focus:underline ': true,
                    'bg-gray-700 dark:bg-blue-200! text-white': isFirstPage,
                    'mr-1 bg-gray-200 dark:bg-gray-900 rounded-xs': !isFirstPage
                  }"
                  @click.prevent="refine(currentRefinement - 1)">
                  ‹
                </button>
              </li>
              <li v-for="page in pages" :key="page">
                <button
                  type="button"
                  :class="{
                    'cursor-pointer py-2 px-3 block no-underline hover:underline focus:underline ': true,
                    'bg-gray-700 dark:bg-blue-200! text-white': page === currentRefinement,
                    'mr-1 bg-gray-200 dark:bg-gray-900 rounded-xs': page !== currentRefinement
                  }"
                  @click.prevent="refine(page)">
                  {{ page + 1 }}
                </button>
              </li>
              <li v-if="!isLastPage">
                <button
                  type="button"
                  aria-label="Go to next page of search results"
                  :class="{
                    'cursor-pointer py-2 px-3 block no-underline hover:underline focus:underline ': true,
                    'bg-gray-700 dark:bg-blue-200! text-white': isLastPage,
                    'mr-1 bg-gray-200 dark:bg-gray-900 rounded-xs': !isLastPage
                  }"
                  @click.prevent="refine(currentRefinement + 1)">
                  ›
                </button>
              </li>
              <li v-if="!isLastPage">
                <button
                  type="button"
                  aria-label="Go to last page of search results"
                  :class="{
                    'cursor-pointer py-2 px-3 block no-underline hover:underline focus:underline ': true,
                    'bg-gray-700 dark:bg-blue-200! text-white': isLastPage,
                    'mr-1 bg-gray-200 dark:bg-gray-900 rounded-xs': !isLastPage
                  }"
                  @click.prevent="refine(nbPages)">
                  ››
                </button>
              </li>
            </ul>
          </div>
        </template>
      </ais-pagination>
    </HorizontalScrollable>

    <label>
      <span class="sr-only">Results per page?</span>
      <ais-hits-per-page
        name="search-results-per-page"
        :items="[
          { label: '10 per page', value: 10, default: true },
          { label: '25 per page', value: 25 },
          { label: '50 per page', value: 50 },
          { label: '100 per page', value: 100 }
        ]"
        :class-names="{
          'ais-HitsPerPage':
            'mt-6 md:mt-0 md:ml-4 px-2 bg-white text-base border border-gray-400 hover:border-black dark:bg-black dark:border-white dark:hover:border-gray-300 dark:text-white px-1 rounded-xs shadow-sm scheme-light dark:scheme-dark',
          'ais-HitsPerPage-select': 'py-2 text-base dark:bg-black dark:text-white scheme-light dark:scheme-dark'
        }" />
    </label>
  </div>
</template>

<script setup lang="ts">
import { AisHitsPerPage, AisPagination } from 'vue-instantsearch/vue3/es'
import { scrollUpToNewSearchResults } from '../utilities/typesense'
</script>
