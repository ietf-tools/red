<template>
  <div :class="classNames?.root">
    <label :for="selectDomId" :class="classNames?.label" :style="showLabel ? undefined : SR_ONLY_STYLE">
      <slot name="label">{{ label }}</slot>
    </label>
    <select :id="selectDomId" :class="classNames?.select" :value="selected" @change="onChange">
      <option value="">{{ allLabel }}</option>
      <option v-for="item in items" :key="item.value" :value="item.value">
        {{ item.label }}{{ showCounts ? ` (${item.count.toLocaleString()})` : '' }}
      </option>
    </select>
  </div>
</template>

<script setup lang="ts">
import { useId } from 'vue'
import { useMenuSelect } from '../connectors/useMenuSelect'
import { SR_ONLY_STYLE } from '../utils/srOnly'
import type { ClassNames } from '../types'

type Props = {
  attribute: string
  label: string
  classNames?: ClassNames
  limit?: number
  showLabel?: boolean
  allLabel?: string
  showCounts?: boolean
  /** See `useMenuSelect`: a second facet supplying display labels for `attribute`'s values. */
  labelAttribute?: string
  /** See `useMenuSelect`: maps a `labelAttribute` value back to the `attribute` value it labels. */
  labelKey?: (labelValue: string) => string
}

const props = withDefaults(defineProps<Props>(), {
  classNames: undefined,
  limit: 20,
  showLabel: true,
  allLabel: 'All',
  showCounts: true,
  labelAttribute: undefined,
  labelKey: undefined
})

const selectDomId = useId()
const { selected, items, refine } = useMenuSelect({
  attribute: props.attribute,
  limit: props.limit,
  labelAttribute: props.labelAttribute,
  labelKey: props.labelKey
})

const onChange = (event: Event) => {
  if (event.target instanceof HTMLSelectElement) refine(event.target.value)
}
</script>
