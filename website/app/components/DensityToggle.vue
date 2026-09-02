<template>
  <fieldset
    class="flex bg-white border border-gray-700 dark:bg-black dark:border-gray-500 shadow-sm rounded-xs"
    :style="FIELDSET_RESET">
    <legend class="sr-only">{{ legend }}</legend>
    <label
      v-for="(option, index) in options"
      :key="option.value"
      :title="option.label"
      :class="[itemClasses, index > 0 ? 'border-l border-gray-400 dark:border-gray-500' : '']">
      <input
        type="radio"
        :name="groupName"
        class="sr-only"
        :value="option.value"
        :checked="value === option.value"
        @change="value = option.value" />
      <component :is="resolveGraphicsIcon(option.icon)" class="w-[15px] h-[15px]" />
      <span class="sr-only">{{ option.label }}</span>
    </label>
  </fieldset>
</template>

<script lang="ts" setup generic="T extends string">
import { useId } from 'vue'
import type { DensityOption } from '~/utilities/density'
import { resolveGraphicsIcon } from '~/utilities/graphics-icon'
// A11y (report F1): a labelled radio group of mutually-exclusive display options.
// - fieldset/legend gives the group an accessible name (supplied by the `legend` prop)
// - native radios give single-selection + arrow-key navigation, and the fieldset is
//   not an extra tab stop (unlike the previous ToggleGroup with aria-pressed)
// - the selected state uses an outline so it stays visible in forced-colors / high contrast
const value = defineModel<T>()

defineProps<{
  legend: string
  options: DensityOption<T>[]
}>()

// Unique per instance so two mounted density controls (desktop + mobile) don't
// merge into one document-wide radio group and fight over the checked state.
const groupName = useId()

// Reset the UA fieldset box (border/padding come from the classes above).
const FIELDSET_RESET = 'margin:0;padding:0;min-inline-size:0'

const itemClasses =
  'relative flex h-[36px] w-[36px] items-center justify-center cursor-pointer bg-white dark:bg-black text-sky-950 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 has-[:checked]:bg-gray-200 dark:has-[:checked]:bg-gray-700 has-[:checked]:outline has-[:checked]:outline-2 has-[:checked]:-outline-offset-2 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-blue-600 first:rounded-l-xs last:rounded-r-xs'
</script>
