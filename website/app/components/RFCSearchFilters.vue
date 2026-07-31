<template>
  <div>
    <div class="flex flex-row w-full gap-3">
      <Heading level="2" class="text-blue-900 dark:text-gray-200 mb-2">Filters</Heading>
      <ResetForm
        aria-label="Reset filters"
        label="Reset"
        :class-names="{
          root: 'mb-3 px-2 py-1 text-sm uppercase rounded text-red-900 dark:text-red-100 border-1 border-red-700 dark:border-1 dark:border-red-200 hover:bg-red-100 hover:dark:bg-red-900  font-bold cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 disabled:no-underline'
        }"
        @reset="emit('reset')" />
    </div>

    <ul>
      <li>
        <ToggleRefinement
          attribute="searchMetadataOnly"
          label="Search only Metadata and Abstract"
          :class-names="{
            root: 'inline-block mb-3',
            label: 'text-base cursor-pointer',
            checkbox: 'mr-2',
            description: 'text-sm pl-[22px] text-gray-800 dark:text-gray-300'
          }" />
      </li>
      <li>
        <ToggleRefinement
          attribute="searchObsoleted"
          label="Search also obsoleted / historic"
          :class-names="{ root: 'inline-block', label: 'text-base cursor-pointer', checkbox: 'mr-2' }" />
      </li>
    </ul>

    <RefinementList
      attribute="status.name"
      label="Status"
      :class-names="filterClasses"
      :sort-by="sortStatuses"
      show-less-aria-label="Show fewer statuses"
      show-more-aria-label="Show more statuses" />

    <!--
      Filtered on the index's stable identifiers rather than its display names, so a rename
      doesn't silently break existing links, and so the worker's legacy /search/ redirects
      (which emit `?stream=ietf` and `?area=art`) resolve. Labels come from the matching
      display-name facet, so areas and streams added to the index need no change here.
    -->
    <Select
      attribute="stream.slug"
      label="Stream"
      label-attribute="stream.name"
      :label-key="streamLabelKey"
      :class-names="selectClasses" />
    <Select
      attribute="area.acronym"
      label="Area"
      label-attribute="area.full"
      :label-key="areaLabelKey"
      :class-names="selectClasses" />

    <RefinementList
      attribute="group.full"
      label="Working group"
      show-more
      :limit="5"
      :show-more-limit="50"
      show-less-aria-label="Show fewer working groups"
      show-more-aria-label="Show more working groups"
      :class-names="filterClasses" />

    <RefinementList
      attribute="authors.name"
      label="Author"
      show-more
      searchable
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
import {
  RefinementList,
  Select,
  YearMonthRangeInput,
  ToggleRefinement,
  ResetForm,
  type ClassNames,
  type RefinementItem
} from '~/components/searchv2'
import { TAILWIND_SELECT_ARROW_PADDING_RIGHT } from '~/utilities/html'

// Shared filter controls, rendered both in the desktop sidebar and the mobile dialog.
// Reset restores the SearchRoot's `defaultUiState`, read from context by ResetForm.
const emit = defineEmits<{ reset: [] }>()

// `stream.name` is `stream.slug` with the original casing, eg `IETF` labels `ietf`.
const streamLabelKey = (streamName: string) => streamName.toLowerCase()

// `area.full` is `<acronym> - <name>`, eg `art - Applications and Real-Time Area` labels `art`.
const areaLabelKey = (areaFull: string) => areaFull.split(' - ')[0] ?? areaFull

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
  root: 'pb-4',
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
  showMore: 'underline text-sky-700 dark:text-blue-100 cursor-pointer',
  truncated: 'mt-1 text-sm px-2 py-1 bg-yellow-100 dark:bg-yellow-900 '
}
const selectClasses: ClassNames = {
  root: 'mb-2 flex flex-col',
  label: 'text-base font-semibold text-blue-900 dark:text-slate-300 mb-1',
  select: `bg-white text-black dark:bg-black dark:text-white w-full px-2 py-2 border border-gray-400 rounded-xs ${TAILWIND_SELECT_ARROW_PADDING_RIGHT}`
}
const dateRangeClasses: ClassNames = {
  root: 'flex flex-wrap items-center gap-2 mb-4',
  legend: 'text-base font-semibold text-blue-900 dark:text-slate-300 mb-1',
  rangeLabel: 'text-sm font-semibold text-blue-900 dark:text-slate-300 w-12',
  select:
    'px-2 py-2 bg-white text-black dark:bg-black dark:text-white border border-gray-400 rounded-xs cursor-pointer',
  fromContainer: 'flex items-center whitespace-nowrap',
  toContainer: 'flex items-center whitespace-nowrap',
  fromYearSelect: `rounded-l-lg rounded-r-none pl-3 ${TAILWIND_SELECT_ARROW_PADDING_RIGHT}`,
  toYearSelect: `rounded-l-lg rounded-r-none pl-3 ${TAILWIND_SELECT_ARROW_PADDING_RIGHT}`,
  fromMonthSelect: `rounded-l-none rounded-r-lg ml-1 ${TAILWIND_SELECT_ARROW_PADDING_RIGHT}`,
  toMonthSelect: `rounded-l-none rounded-r-lg ml-1 ${TAILWIND_SELECT_ARROW_PADDING_RIGHT}`
}
</script>
