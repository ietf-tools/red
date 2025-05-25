<template>
  <form
    class="flex flex-col gap-5 text-base text-grey-800 pt-3 lg:pt-0 pl-5 lg:pl-0 lg:pr-10"
  >
    <Heading level="2" style-level="4" class="hidden lg:block">
      Filter
    </Heading>

    <SearchFilterStatuses />

    <DateYearMonthRange
      v-model:start="startValue"
      v-model:end="endValue"
      :start-range-date="OLDEST_RFC"
      :end-range-date="NEWEST_POTENTIAL_RFC"
      label="Publication date"
      start-label="from"
      start-placeholder="Date from"
      end-label="to"
      end-placeholder="Date to"
    />

    <SearchFilterSelect
      label="Stream"
      attribute="stream"
    />

    <SearchFilterSelect
      label="Area"
      attribute="area"
    />

    <SearchFilterSelect
      label="Working group"
      attribute="group"
      searchable
    />

    <ais-clear-refinements :excluded-attributes="['type']" class="hidden lg:block">
      <template #default="{ canRefine, refine }">
        <button
          type="button"
          class="underline text-blue-700 dark:text-blue-100 px-3 py-2 -ml-3 cursor-pointer"
          :disabled="!canRefine"
          @click.prevent="refine"
        >
          Clear all
        </button>
      </template>
    </ais-clear-refinements>
  </form>
</template>

<script setup lang="ts">
import { AisClearRefinements } from 'vue-instantsearch/vue3/es'
// This template and any descendant components within it might be rendered multiple times
// simultaneously in the DOM so please ensure unique DOM ids, or avoid them entirely (eg
// <label> wrapping)
import { useSearchStore } from '~/stores/search'

const searchStore = useSearchStore()

function parseDate(yearMonth: string): Date | undefined {
  if (yearMonth === '') {
    return undefined
  }
  const [year, month] = yearMonth.split('-')
  return new Date(parseFloat(year), parseFloat(month) - 1)
}

/**
 * The store uses `Date` objects whereas <DateYearMonthRange> expects
 * strings of `YYYY-M` (eg `2024-3`) so we'll convert them here.
 **/
const startValue = computed({
  get() {
    return stringifyDate(searchStore.publicationDateFrom)
  },
  set(yearMonth: string) {
    searchStore.publicationDateFrom = parseDate(yearMonth)
  }
})
const endValue = computed({
  get() {
    return stringifyDate(searchStore.publicationDateTo)
  },
  set(yearMonth: string) {
    searchStore.publicationDateTo = parseDate(yearMonth)
  }
})

const OLDEST_RFC = new Date('1969-01-01')
const NEWEST_POTENTIAL_RFC = new Date()
</script>
