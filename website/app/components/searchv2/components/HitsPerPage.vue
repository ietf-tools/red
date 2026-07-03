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
import { useHitsPerPage, type HitsPerPageItem } from '../connectors/useHitsPerPage'
import { SR_ONLY_STYLE } from '../utils/srOnly'
import type { ClassNames } from '../types'

type Props = {
  items: HitsPerPageItem[]
  classNames?: ClassNames
  label?: string
  showLabel?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  classNames: undefined,
  label: 'Results per page',
  showLabel: false
})

const selectDomId = useId()
const { items, current, refine } = useHitsPerPage(props.items)

const onChange = (event: Event) => {
  if (event.target instanceof HTMLSelectElement) {
    const value = Number.parseInt(event.target.value, 10)
    if (!Number.isNaN(value)) refine(value)
  }
}
</script>
