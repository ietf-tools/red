<template>
  <div>
    <div class="flex flex-row w-full gap-3">
      <Heading level="2" class="text-blue-900 dark:text-gray-200 mb-2">Filters</Heading>

      <ResetForm
        :defaults="defaultUiState"
        aria-label="Reset filters"
        label="Reset"
        :class-names="{
          root: 'mb-3 px-2 py-1 text-sm uppercase rounded text-red-900 border-1 border-red-700 dark:border-1 dark:border-red-800 font-bold cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 disabled:no-underline'
        }"
        @reset="emit('reset')" />
    </div>
    <ul class="mb-2">
      <li>
        <ToggleRefinement
          attribute="contents"
          label="Search in RFC contents"
          :class-names="{ root: 'inline-block mb-3 text-base cursor-pointer', checkbox: 'mr-2' }" />
      </li>
      <li>
        <ToggleRefinement
          attribute="flags.hiddenDefault"
          label="Hide obsoleted / historic"
          :class-names="{ root: 'inline-block clear-both text-base cursor-pointer', checkbox: 'mr-2' }" />
      </li>
    </ul>

    <RefinementList
      attribute="status.name"
      label="Status"
      :class-names="filterClasses"
      :sort-by="sortStatuses"
      show-less-aria-label="Show fewer statuses"
      show-more-aria-label="Show more statuses" />

    <Select attribute="stream.name" label="Stream" :class-names="selectClasses" />
    <Select attribute="area.full" label="Area" :class-names="selectClasses" />

    <RefinementList
      attribute="group.full"
      label="Working group"
      searchable
      show-more
      :limit="5"
      :show-more-limit="50"
      show-less-aria-label="Show fewer working groups"
      show-more-aria-label="Show more working groups"
      :class-names="filterClasses" />

    <RefinementList
      attribute="authors.name"
      label="Author"
      searchable
      show-more
      :limit="5"
      :show-more-limit="50"
      show-less-aria-label="Show fewer authors"
      show-more-aria-label="Show more authors"
      :class-names="filterClasses" />

    <YearMonthRangeInput
      attribute="publicationDate"
      label="Publication date"
      from-label="From:"
      to-label="To:"
      :min-year="1969"
      :class-names="dateRangeClasses" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  RefinementList,
  Select,
  YearMonthRangeInput,
  ToggleRefinement,
  ResetForm,
  type ClassNames,
  type RefinementItem,
  type UiState
} from '~/components/searchv2'
import { useFeatureFlags } from '~/utilities/feature-flags'

// Shared filter controls, rendered both in the desktop sidebar and the mobile dialog.
const emit = defineEmits<{ reset: [] }>()

const featureFlags = useFeatureFlags()
const defaultShowObsoleted = computed(() => Boolean(featureFlags.value.searchObsoletedDefaults))

const defaultUiState = computed<UiState>(() => ({
  toggles: { 'flags.hiddenDefault': !defaultShowObsoleted.value, contents: false }
}))

const STATUS_ORDER = [
  'Internet Standard',
  'Best Current Practice',
  'Proposed Standard',
  'Draft Standard',
  'Informational',
  'Experimental',
  'Historic'
]
const sortStatuses = (a: RefinementItem, b: RefinementItem): number => {
  const indexOf = (value: string) => {
    const index = STATUS_ORDER.indexOf(value)
    return index === -1 ? STATUS_ORDER.length : index
  }
  return indexOf(a.value) - indexOf(b.value)
}

const filterClasses: ClassNames = {
  root: 'mb-6',
  legend: 'text-lg font-semibold text-blue-900 dark:text-slate-300 pt-3 mb-1',
  searchBox: 'mb-2',
  searchLabel: 'font-bold text-blue-900 dark:text-slate-300',
  searchInput:
    'w-full px-3 py-1.5 text-base border bg-white dark:bg-black border-gray-400 rounded dark:bg-black dark:text-white',
  list: 'w-fit',
  item: '',
  checkbox: 'mt-1.5',
  itemLabel: 'flex text-base cursor-pointer w-full items-start justify-start gap-2 mb-1',
  count: 'bg-gray-600 dark:bg-gray-700 rounded-sm text-xs ml-auto px-2 py-1 font-bold text-white',
  showMore: 'underline text-sky-700 dark:text-blue-100 cursor-pointer mb-6'
}
const selectClasses: ClassNames = {
  root: 'mb-2 flex flex-col',
  label: 'text-base font-semibold text-blue-900 dark:text-slate-300 mt-3 mb-1',
  select: 'bg-white text-black dark:bg-black dark:text-white w-full px-2 py-2 border border-gray-400 rounded-xs'
}
const dateRangeClasses: ClassNames = {
  root: 'flex flex-wrap items-center gap-2 mb-4',
  legend: 'text-base font-semibold text-blue-900 dark:text-slate-300 mt-3 mb-1',
  rangeLabel: 'text-sm font-semibold text-blue-900 dark:text-slate-300 w-12',
  select:
    'px-2 py-2 bg-white text-black dark:bg-black dark:text-white border border-gray-400 rounded-xs cursor-pointer',
  fromContainer: 'flex items-center gap-2 whitespace-nowrap',
  toContainer: 'flex items-center gap-2 whitespace-nowrap',
  fromYearSelect: 'rounded-l-lg',
  toYearSelect: 'rounded-l-lg',
  fromMonthSelect: 'rounded-r-lg',
  toMonthSelect: 'rounded-r-lg'
}
</script>
