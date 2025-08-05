<template>
  <label class="w-full">
    <span class="sr-only">{{ props.label }}</span>
    <select
      v-model="value"
      class="w-full text-base border border-gray-400 dark:border-white dark:text-white py-2 pl-1 pr-6 scheme-light dark:scheme-dark"
      :title="props.label"
    >
      <option value="" :disabled="isDisabled" class="text-gray-700">
        {{ props.placeholder }}
      </option>
      <option value="">Any</option>
      <optgroup
        v-for="(yearMonthsArr, index) in yearMonthsByYear"
        :key="index"
        :label="yearMonthsArr[0]"
      >
        <option
          v-for="[yearMonthValue, yearMonthLabel] in yearMonthsArr[1]"
          :key="yearMonthValue"
          :value="yearMonthValue"
        >
          {{ yearMonthLabel }}
        </option>
      </optgroup>
    </select>
  </label>
</template>

<script setup lang="ts">
import { formatDateString } from '~/utilities/date'

type Props = {
  label: string
  placeholder: string
  startDate: Date
  endDate: Date
}

const props = defineProps<Props>()

const value = defineModel<string>()

const monthNames = [
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
]

const startYear = props.startDate.getFullYear()

const numberOfOptions =
  (props.endDate.getFullYear() - startYear) * 12 +
  (props.endDate.getMonth() + 1)

/**
 * ie,
 * ```
 * [
 *   ['2024', [
 *      ['2024-1', '2024 January'],
 *      ['2024-2', '2024 February'],
 *      ...
 *   ],
 *   ['2023', [
 *      ['2023-1', '2023 January'],
 *      ['2023-2', '2023 February'],
 *      ...
 *   ],
 *   ...
 * ]
 * ```
 */
type YearMonthByYear = [string, [string, string][]][]

const yearMonthsByYear = new Array(numberOfOptions)
  .fill(0)
  .map((_, i): [string, string] => {
    const year = startYear + Math.floor(i / 12)
    const zeroBasedMonth = i % 12
    return [
      formatDateString(year, zeroBasedMonth + 1),
      `${year} ${monthNames[zeroBasedMonth]}`
    ]
  })
  .reverse()
  .reduce((acc, valueLabelArr) => {
    const year = valueLabelArr[0].substring(0, 4)
    let yearMonth: YearMonthByYear[number] | undefined = acc[acc.length - 1]
    if (!yearMonth || yearMonth[0] !== year) {
      yearMonth = [year, []]
      acc.push(yearMonth)
    }
    yearMonth[1].push(valueLabelArr)
    return acc
  }, [] as YearMonthByYear)

/**
 * This is a workaround.
 * To have placeholder-like behaviour in a native <select> you can make the first option disabled.
 * The first option will appear selected by default, but the user can't choose it, so it functions
 * a bit like a placeholder.
 * Unfortunately Vue doesn't want to select an
 **/
const isDisabled = ref(false)
nextTick(() => {
  isDisabled.value = true
})
</script>
