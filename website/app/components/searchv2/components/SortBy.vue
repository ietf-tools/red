<template>
  <div :class="classNames?.root">
    <label :for="selectDomId" :class="classNames?.label" :style="showLabel ? undefined : SR_ONLY_STYLE">
      <slot name="label">{{ label }}</slot>
    </label>
    <select :id="selectDomId" :class="classNames?.select" :value="current" @change="onChange">
      <option v-for="item in items" :key="item.value" :value="item.value">{{ item.label }}</option>
    </select>
  </div>
</template>

<script setup lang="ts">
import { useId } from 'vue'
import { useSortBy, type SortByItem } from '../connectors/useSortBy'
import { SR_ONLY_STYLE } from '../utils/srOnly'
import type { ClassNames } from '../types'

type Props = {
  items: SortByItem[]
  classNames?: ClassNames
  label?: string
  showLabel?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  classNames: undefined,
  label: 'Sort by',
  showLabel: true
})

const selectDomId = useId()
const { items, current, refine } = useSortBy(props.items)

const onChange = (event: Event) => {
  if (event.target instanceof HTMLSelectElement) refine(event.target.value)
}
</script>
