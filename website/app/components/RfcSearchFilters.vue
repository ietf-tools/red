<template>
  <div>
    <ToggleRefinement
      attribute="contents"
      label="Search in RFC contents"
      :class-names="{ root: 'flex items-center gap-2 mb-4 text-base cursor-pointer' }" />
    <ToggleRefinement
      attribute="flags.hiddenDefault"
      label="Hide obsoleted / historic"
      :class-names="{ root: 'flex items-center gap-2 mb-4 text-base cursor-pointer' }" />

    <RefinementList attribute="status.name" label="Status" :class-names="filterClasses" :sort-by="sortStatuses" />

    <Select attribute="stream.name" label="Stream" :class-names="selectClasses" />
    <Select attribute="area.full" label="Area" :class-names="selectClasses" />

    <RefinementList
      attribute="group.full"
      label="Search for Working group"
      searchable
      show-more
      :limit="5"
      :show-more-limit="50"
      search-placeholder=""
      :class-names="filterClasses" />

    <RefinementList
      attribute="authors.name"
      label="Search for author"
      searchable
      show-more
      :limit="5"
      :show-more-limit="50"
      search-placeholder=""
      :class-names="filterClasses" />

    <YearMonthRangeInput
      attribute="publicationDate"
      label="Publication date"
      :min-year="1969"
      :class-names="dateRangeClasses" />

    <ResetForm
      :defaults="defaultUiState"
      label="Reset filters"
      :class-names="{
        root: 'mt-10 mb-3 px-2 py-2 bg-red-900 dark:bg-red-950 dark:border-1 dark:border-red-800 font-bold text-white dark:text-white cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 disabled:no-underline'
      }"
      @reset="emit('reset')" />
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
const defaultShowObsoleted = Boolean(featureFlags.value.searchObsoletedDefaults)

const defaultUiState = computed<UiState>(() => ({
  toggles: { 'flags.hiddenDefault': !defaultShowObsoleted, contents: false }
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
  legend: 'text-base font-semibold text-blue-900 dark:text-slate-300 mt-3 mb-1',
  searchBox: 'mb-2',
  searchInput:
    'w-full px-3 py-1.5 text-base border bg-white dark:bg-black border-gray-400 rounded-xs dark:bg-black dark:text-white',
  list: 'w-fit',
  item: 'whitespace-nowrap',
  itemLabel: 'flex text-base cursor-pointer w-full items-center gap-2 mb-1',
  count: 'bg-gray-600 dark:bg-gray-700 rounded-sm text-xs ml-auto px-2 py-1 font-bold text-white',
  showMore: 'underline text-sky-700 dark:text-blue-100 cursor-pointer mb-6'
}
const selectClasses: ClassNames = {
  root: 'mb-2 flex flex-col',
  label: 'text-base font-semibold text-blue-900 dark:text-slate-300 mt-3 mb-1',
  select: 'bg-white text-black dark:bg-black dark:text-white w-full px-1 py-2 border border-gray-400 rounded-xs'
}
const dateRangeClasses: ClassNames = {
  root: 'flex flex-wrap items-center gap-2 mb-4',
  legend: 'text-base font-semibold text-blue-900 dark:text-slate-300 mt-3 mb-1',
  rangeLabel: 'text-base font-semibold text-blue-900 dark:text-slate-300 w-12',
  select:
    'px-1 py-2 bg-white text-black dark:bg-black dark:text-white border border-gray-400 rounded-xs cursor-pointer',
  fromContainer: 'flex items-center gap-2 whitespace-nowrap',
  toContainer: 'flex items-center gap-2 whitespace-nowrap'
}
</script>
