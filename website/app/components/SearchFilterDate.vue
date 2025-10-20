<template>
  <fieldset class="w-full">
    <legend class="text-base font-bold text-blue-900 dark:text-slate-300 mb-1">{{ props.label }}</legend>
    <div class="w-full text-base">
      <ais-range-input
        ref="rangeInput"
        attribute="publicationDate"
      >
        <template #default="{ currentRefinement, range, refine }">
          <div class="flex items-center">
            <div
              class="flex items-center bg-white dark:bg-black border rounded-xs border-gray-400 hover:border-black dark:border-white dark:hover:border-gray-300 dark:text-white px-2 py-1.5 shadow-sm scheme-light dark:scheme-dark"
            >
              <!-- START YEAR -->
              <select-root
                :model-value="getYear(currentRefinement.min, range.min)"
                @update:model-value="val => refine(adaptUpdate(currentRefinement, range, 'minYear', val))"
              >
                <select-trigger
                  class="flex items-center"
                  :aria-label="props.label + ' start year'"
                >
                  <select-value placeholder="YYYY" />
                  <icon
                    name="ph:caret-down-bold"
                    size=".8em"
                    class="ml-1"
                  />
                </select-trigger>
                <select-portal>
                  <select-content
                    class="bg-white dark:bg-black rounded-xs border shadow-sm z-[100]"
                    :side-offset="5"
                  >
                    <select-viewport class="p-[5px]">
                      <select-item
                        v-for="year of getYearsRange(range)"
                        :key="year"
                        :value="year"
                        class="flex items-center pl-[20px] cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-700"
                      >
                        <SelectItemIndicator class="absolute left-0 w-[25px] inline-flex items-center justify-center">
                          <icon
                            name="fa-solid:check"
                            size=".8em"
                          />
                        </SelectItemIndicator>
                        <select-item-text>{{ year }}</select-item-text>
                      </select-item>
                    </select-viewport>
                  </select-content>
                </select-portal>
              </select-root>
              <!-- START MONTH -->
              <select-root
                :model-value="getMonth(currentRefinement.min, range.min)"
                @update:model-value="val => refine(adaptUpdate(currentRefinement, range, 'minMonth', val))"
              >
                <select-trigger
                  class="flex items-center ml-2"
                  :aria-label="props.label + ' start month'"
                >
                  <select-value placeholder="MMM" />
                  <icon
                    name="ph:caret-down-bold"
                    size=".8em"
                    class="ml-1"
                  />
                </select-trigger>
                <select-portal>
                  <select-content
                    class="bg-white dark:bg-black rounded-xs border shadow-sm z-[100]"
                    :side-offset="5"
                  >
                    <select-viewport class="p-[5px]">
                      <select-item
                        v-for="month of months"
                        :key="month.num"
                        :value="month.num"
                        class="flex items-center pl-[20px] cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-700"
                      >
                        <SelectItemIndicator class="absolute left-0 w-[25px] inline-flex items-center justify-center">
                          <icon
                            name="fa-solid:check"
                            size=".8em"
                          />
                        </SelectItemIndicator>
                        <select-item-text>{{ month.name }}</select-item-text>
                      </select-item>
                    </select-viewport>
                  </select-content>
                </select-portal>
              </select-root>
            </div>
            <span class="px-2">to</span>
            <div
              class="flex items-center bg-white dark:bg-black border rounded-xs border-gray-400 hover:border-black dark:border-white dark:hover:border-gray-300 dark:text-white px-2 py-1.5 shadow-sm scheme-light dark:scheme-dark"
            >
              <!-- END YEAR -->
              <select-root
                :model-value="getYear(currentRefinement.max, range.max)"
                @update:model-value="val => refine(adaptUpdate(currentRefinement, range, 'maxYear', val))"
              >
                <select-trigger
                  class="flex items-center"
                  :aria-label="props.label + ' end year'"
                >
                  <select-value placeholder="YYYY" />
                  <icon
                    name="ph:caret-down-bold"
                    size=".8em"
                    class="ml-1"
                  />
                </select-trigger>
                <select-portal>
                  <select-content
                    class="bg-white dark:bg-black rounded-xs border shadow-sm z-[100]"
                    :side-offset="5"
                  >
                    <select-viewport class="p-[5px]">
                      <select-item
                        v-for="year of getYearsRange(range)"
                        :key="year"
                        :value="year"
                        class="flex items-center pl-[20px] cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-700"
                      >
                        <SelectItemIndicator class="absolute left-0 w-[25px] inline-flex items-center justify-center">
                          <icon
                            name="fa-solid:check"
                            size=".8em"
                          />
                        </SelectItemIndicator>
                        <select-item-text>{{ year }}</select-item-text>
                      </select-item>
                    </select-viewport>
                  </select-content>
                </select-portal>
              </select-root>
              <!-- END MONTH -->
              <select-root
                :model-value="getMonth(currentRefinement.max, range.max)"
                @update:model-value="val => refine(adaptUpdate(currentRefinement, range, 'maxMonth', val))"
              >
                <select-trigger
                  class="flex items-center ml-2"
                  :aria-label="props.label + ' start year'"
                >
                  <select-value placeholder="MMM" />
                  <icon
                    name="ph:caret-down-bold"
                    size=".8em"
                    class="ml-1"
                  />
                </select-trigger>
                <select-portal>
                  <select-content
                    class="bg-white dark:bg-black rounded-xs border shadow-sm z-[100]"
                    :side-offset="5"
                  >
                    <select-viewport class="p-[5px]">
                      <select-item
                        v-for="month of months"
                        :key="month.num"
                        :value="month.num"
                        class="flex items-center pl-[20px] cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-700"
                      >
                        <SelectItemIndicator class="absolute left-0 w-[25px] inline-flex items-center justify-center">
                          <icon
                            name="fa-solid:check"
                            size=".8em"
                          />
                        </SelectItemIndicator>
                        <select-item-text>{{ month.name }}</select-item-text>
                      </select-item>
                    </select-viewport>
                  </select-content>
                </select-portal>
              </select-root>
            </div>
          </div>
        </template>
      </ais-range-input>
    </div>
  </fieldset>
</template>

<script setup lang="ts">
import { AisRangeInput } from 'vue-instantsearch/vue3/es'
import {
  SelectContent,
  SelectItem,
  SelectItemIndicator,
  SelectPortal,
  SelectRoot,
  SelectTrigger,
  type AcceptableValue,
} from 'reka-ui'
import { DateTime, Info } from 'luxon'
import { times } from 'lodash-es'

type Props = {
  label: string
  attribute: string
}

type UnixRange = {
  min: number
  max: number
}

type UpdateMode = 'minYear' | 'minMonth' | 'maxYear' | 'maxMonth'

const props = defineProps<Props>()

const months = Info.months('short').map((m, idx) => ({
  num: idx + 1,
  name: m
}))

function getYearsRange(range: UnixRange) {
  const minYear = DateTime.fromSeconds(range.min, { zone: 'utc' }).year
  const maxYear = DateTime.fromSeconds(range.max, { zone: 'utc' }).year

  return times(maxYear - minYear + 1, n => minYear + n)
}

function getYear(ts: number, fallback: number): number | undefined {
  return DateTime.fromSeconds(ts ?? fallback, { zone: 'utc' }).year
}

function getMonth(ts: number, fallback: number): number | undefined {
  return DateTime.fromSeconds(ts ?? fallback, { zone: 'utc' }).month
}

function adaptUpdate(currentRange: UnixRange, rangeBounds: UnixRange, mode: UpdateMode, newValue: AcceptableValue): UnixRange {
  if (typeof newValue === 'object') {
    return currentRange
  }

  const newValueNumber = (typeof newValue === 'string') ? parseFloat(newValue) : Number(newValue)

  if (mode.startsWith('min')) {
    let startDate = DateTime.fromSeconds(currentRange.min ?? rangeBounds.min, { zone: 'utc' })
    if (mode.endsWith('Year')) {
      startDate = startDate.set({ year: newValueNumber })
    } else {
      startDate = startDate.set({ month: newValueNumber })
    }
    const startDateUnix = startDate.startOf('month').toUnixInteger()
    return {
      min: startDateUnix > rangeBounds.min ? startDateUnix : rangeBounds.min,
      max: currentRange.max
    }
  } else {
    let endDate = DateTime.fromSeconds(currentRange.max ?? rangeBounds.max, { zone: 'utc' })
    if (mode.endsWith('Year')) {
      endDate = endDate.set({ year: newValueNumber })
    } else {
      endDate = endDate.set({ month: newValueNumber })
    }
    const endDateUnix = endDate.endOf('month').toUnixInteger()
    return {
      min: currentRange.min,
      max: endDateUnix < rangeBounds.max ? endDateUnix : rangeBounds.max,
    }
  }
}
</script>
