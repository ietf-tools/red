<template>
  <Fieldset :legend="label" :legend-class="classNames?.legend" :class="classNames?.root">
    <div :class="classNames?.fromContainer">
      <span :class="classNames?.rangeLabel">{{ fromLabel }}</span>
      <label :for="fromYearDomId" :class="classNames?.label" :style="SR_ONLY_STYLE">{{ fromYearLabel }}</label>
      <select
        :id="fromYearDomId"
        :class="[classNames?.select, classNames?.fromYearSelect]"
        :value="fromYear ?? ''"
        @change="onFromYear">
        <option value="">{{ anyYearLabel }}</option>
        <option v-for="year in years" :key="year" :value="year">{{ year }}</option>
      </select>
      <label :for="fromMonthDomId" :class="classNames?.label" :style="SR_ONLY_STYLE">{{ fromMonthLabel }}</label>
      <select
        :id="fromMonthDomId"
        :class="[classNames?.select, classNames?.fromMonthSelect]"
        :value="fromMonth ?? ''"
        @change="onFromMonth">
        <option value="">{{ anyMonthLabel }}</option>
        <option v-for="(name, index) in monthNames" :key="index" :value="index + 1">{{ name }}</option>
      </select>
    </div>

    <div :class="classNames?.toContainer">
      <span :class="classNames?.rangeLabel">{{ toLabel }}</span>
      <label :for="toYearDomId" :class="classNames?.label" :style="SR_ONLY_STYLE">{{ toYearLabel }}</label>
      <select
        :id="toYearDomId"
        :class="[classNames?.select, classNames?.toYearSelect]"
        :value="toYear ?? ''"
        @change="onToYear">
        <option value="">{{ anyYearLabel }}</option>
        <option v-for="year in years" :key="year" :value="year">{{ year }}</option>
      </select>
      <label :for="toMonthDomId" :class="classNames?.label" :style="SR_ONLY_STYLE">{{ toMonthLabel }}</label>
      <select
        :id="toMonthDomId"
        :class="[classNames?.select, classNames?.toMonthSelect]"
        :value="toMonth ?? ''"
        @change="onToMonth">
        <option value="">{{ anyMonthLabel }}</option>
        <option v-for="(name, index) in monthNames" :key="index" :value="index + 1">{{ name }}</option>
      </select>
    </div>
  </Fieldset>
</template>

<script setup lang="ts">
import { computed, useId } from 'vue'
import Fieldset from '../a11y/Fieldset.vue'
import { useRange } from '../connectors/useRange'
import { SR_ONLY_STYLE } from '../utils/srOnly'
import type { ClassNames } from '../types'

type Props = {
  attribute: string
  /** Accessible name for the range group. */
  label: string
  classNames?: ClassNames
  /** Earliest selectable year (inclusive). */
  minYear?: number
  /** Latest selectable year (inclusive). Defaults to the current UTC year. */
  maxYear?: number
  /** 12 month names, January-first; override for wording / localisation. */
  monthNames?: string[]
  fromLabel?: string
  toLabel?: string
  fromYearLabel?: string
  fromMonthLabel?: string
  toYearLabel?: string
  toMonthLabel?: string
  anyYearLabel?: string
  anyMonthLabel?: string
}

const props = withDefaults(defineProps<Props>(), {
  classNames: undefined,
  minYear: 1970,
  maxYear: undefined,
  monthNames: () => [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December'
  ],
  fromLabel: 'From:',
  toLabel: 'To:',
  fromYearLabel: 'From year',
  fromMonthLabel: 'From month',
  toYearLabel: 'To year',
  toMonthLabel: 'To month',
  anyYearLabel: 'Any year',
  anyMonthLabel: 'Any month'
})

const { current, refine } = useRange({ attribute: props.attribute })

const fromYearDomId = useId()
const fromMonthDomId = useId()
const toYearDomId = useId()
const toMonthDomId = useId()

const maxSelectableYear = computed(() => props.maxYear ?? new Date().getUTCFullYear())

// Years, newest first.
const years = computed(() => {
  const list: number[] = []
  for (let year = maxSelectableYear.value; year >= props.minYear; year -= 1) list.push(year)
  return list
})

// The range is stored as unix seconds; derive the current select values from it.
const partsOf = (unixSeconds: number | undefined) => {
  if (unixSeconds === undefined) return { year: undefined, month: undefined }
  const date = new Date(unixSeconds * 1000)
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 }
}
const fromYear = computed(() => partsOf(current.value.min).year)
const fromMonth = computed(() => partsOf(current.value.min).month)
const toYear = computed(() => partsOf(current.value.max).year)
const toMonth = computed(() => partsOf(current.value.max).month)

// Start of the given year/month (or Jan) as unix seconds; undefined when no year.
const startUnix = (year: number | undefined, month: number | undefined): number | undefined =>
  year === undefined ? undefined : Math.floor(Date.UTC(year, (month ?? 1) - 1, 1, 0, 0, 0) / 1000)

// End of the given year/month (or Dec) as unix seconds; undefined when no year.
const endUnix = (year: number | undefined, month: number | undefined): number | undefined =>
  year === undefined ? undefined : Math.floor(Date.UTC(year, month ?? 12, 0, 23, 59, 59) / 1000)

const commit = (fy: number | undefined, fm: number | undefined, ty: number | undefined, tm: number | undefined) => {
  refine({ min: startUnix(fy, fm), max: endUnix(ty, tm) })
}

const readNumber = (event: Event): number | undefined => {
  if (!(event.target instanceof HTMLSelectElement) || event.target.value === '') return undefined
  return Number(event.target.value)
}

const onFromYear = (event: Event) => commit(readNumber(event), fromMonth.value, toYear.value, toMonth.value)
const onFromMonth = (event: Event) => commit(fromYear.value, readNumber(event), toYear.value, toMonth.value)
const onToYear = (event: Event) => commit(fromYear.value, fromMonth.value, readNumber(event), toMonth.value)
const onToMonth = (event: Event) => commit(fromYear.value, fromMonth.value, toYear.value, readNumber(event))
</script>
