<template>
  <div class="flex flex-col items-center md:justify-center md:flex-row mt-8">
    <HorizontalScrollable class="md:w-full" inner-class="py-1">
      <ais-pagination
        :class-names="{
          'ais-Pagination': 'w-full md:w-auto',
          'ais-Pagination-list': 'w-auto ml-auto mr-auto flex flex-row justify-left md:justify-center',
          'ais-Pagination-item': 'mr-1 bg-gray-200 dark:bg-gray-900 rounded-xs',
          'ais-Pagination-item--selected':
            'bg-gray-700 dark:bg-blue-200! text-white',
          'ais-Pagination-item--disabled':
            'bg-transparent dark:bg-transparent text-gray-800 dark:text-gray-200',
          'ais-Pagination-link':
            'cursor-pointer py-2 px-3 block no-underline hover:underline focus:underline'
        }"
        @click="scrollUpToNewSearchResults"
      />
    </HorizontalScrollable>
    <ais-hits-per-page
      :items="[
        { label: '10 per page', value: 10, default: true },
        { label: '25 per page', value: 25 },
        { label: '50 per page', value: 50 },
        { label: '100 per page', value: 100 }
      ]"
      :class-names="{
        'ais-HitsPerPage':
          'mt-6 md:mt-0 md:ml-4 px-2 bg-white text-base border border-gray-400 hover:border-black dark:bg-black dark:border-white dark:hover:border-gray-300 dark:text-white px-1 rounded-xs shadow-sm scheme-light dark:scheme-dark',
        'ais-HitsPerPage-select':
          'py-2 text-base dark:bg-black dark:text-white scheme-light dark:scheme-dark'
      }"
    />
  </div>
</template>

<script setup lang="ts">
import { AisHitsPerPage, AisPagination } from 'vue-instantsearch/vue3/es'
import { prefersReducedMotion } from '~/utilities/accessibility'
import { INSTANTSEARCH_HITS_CONTAINER_DOM_ID } from '~/utilities/typesense'

/**
 * When clicking pagination we should scroll the user back to the top of the results
 */
const scrollUpToNewSearchResults = () => {
  console.info("Scroll up page to new search results")
  const target = document.getElementById(INSTANTSEARCH_HITS_CONTAINER_DOM_ID)
  if (target) {
    const scrollBehavior: ScrollBehavior = prefersReducedMotion() ? 'instant' : 'smooth'
    target.focus() // for keyboard users
    target.scrollIntoView({ behavior: scrollBehavior })
  } else {
    document.body.focus() // for keyboard users
    window.scrollTo(0, 0)
  }
}
</script>
