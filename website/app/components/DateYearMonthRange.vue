<template>
  <fieldset class="w-full">
    <legend class="text-base font-bold mb-1">{{ props.label }}</legend>
    <div
      class="w-full text-base border border-gray-400 dark:border-white dark:text-white px-2 py-1 scheme-light dark:scheme-dark"
    >
      <ais-range-input
        attribute="publicationDate"
        :min="minAisValue"
        :max="maxAisValue"
        :precision="0"
      >
        <template #default="{ currentRefinement, refine }">
          <DateRangeFieldRoot
            v-slot="{ segments }"
            granularity="day"
            :min-value="minDateRange"
            :max-value="maxDateRange"
            class="flex flex-row justify-center"
            :model-value="convertUnixRange(currentRefinement)"
            @update:model-value="
              (val: DateRange) => refine(handleValueUpdate(val))
            "
          >
            <template v-for="item in segments.start" :key="item.part">
              <DateRangeFieldInput
                v-if="item.part === 'literal'"
                :part="item.part"
                type="start"
              >
                {{ item.value }}
              </DateRangeFieldInput>
              <DateRangeFieldInput
                v-else
                :part="item.part"
                class="rounded p-0.5 focus:outline-none focus:shadow-[0_0_0_2px] focus:shadow-black data-[placeholder]:text-green9"
                type="start"
              >
                {{ item.value }}
              </DateRangeFieldInput>
            </template>
            <span class="mx-2"> -&gt; </span>
            <template v-for="item in segments.end" :key="item.part">
              <DateRangeFieldInput
                v-if="item.part === 'literal'"
                :part="item.part"
                type="end"
              >
                {{ item.value }}
              </DateRangeFieldInput>
              <DateRangeFieldInput
                v-else
                :part="item.part"
                class="rounded p-0.5 focus:outline-none focus:shadow-[0_0_0_2px] focus:shadow-black data-[placeholder]:text-green9"
                type="end"
              >
                {{ item.value }}
              </DateRangeFieldInput>
            </template>
          </DateRangeFieldRoot>
        </template>
      </ais-range-input>
    </div>
  </fieldset>
</template>

<script setup lang="ts">
import {
  CalendarDate,
  fromAbsolute,
  getLocalTimeZone,
  parseDate,
  today
} from '@internationalized/date'
import { AisRangeInput } from 'vue-instantsearch/vue3/es'
import {
  DateRangeFieldInput,
  DateRangeFieldRoot,
  type DateRange
} from 'reka-ui'

type Props = {
  label: string
  startRangeDate?: string
  endRangeDate?: string
  startLabel: string
  endLabel: string
  startPlaceholder: string
  endPlaceholder: string
}

const props = defineProps<Props>()

const currentTimeZone = getLocalTimeZone()

const minDateRange =
  props.startRangeDate ?
    parseDate(props.startRangeDate).subtract({ days: 1 })
  : new CalendarDate(1968, 12, 31)
const maxDateRange =
  props.endRangeDate ?
    parseDate(props.endRangeDate).add({ days: 1 })
  : today(currentTimeZone).add({ days: 1 })
const minAisValue = computed(() =>
  Math.floor(minDateRange.toDate(currentTimeZone).valueOf() / 1000)
)
const maxAisValue = computed(() =>
  Math.floor(maxDateRange.toDate(currentTimeZone).valueOf() / 1000)
)

type UnixRange = {
  min: number
  max: number
}

function convertUnixRange(unixRange: UnixRange): DateRange {
  return {
    start:
      unixRange.min ?
        fromAbsolute(unixRange.min * 1000, currentTimeZone)
      : undefined,
    end:
      unixRange.max ?
        fromAbsolute(unixRange.max * 1000, currentTimeZone)
      : undefined
  }
}

function handleValueUpdate(dateRange: DateRange) {
  return {
    min:
      dateRange.start ?
        Math.floor(dateRange.start.toDate(currentTimeZone).valueOf() / 1000)
      : minAisValue.value,
    max:
      dateRange.end ?
        Math.floor(dateRange.end.toDate(currentTimeZone).valueOf() / 1000)
      : maxAisValue.value
  }
}
</script>
