<template>
  <div role="group" :aria-label="label" :class="classNames?.root">
    <label :for="minDomId" :class="classNames?.label" :style="showLabels ? undefined : SR_ONLY_STYLE">
      {{ minLabel }}
    </label>
    <input
      :id="minDomId"
      type="number"
      :class="classNames?.input"
      :value="current.min ?? ''"
      :min="bounds?.min"
      :max="bounds?.max"
      @change="onMin" />
    <label :for="maxDomId" :class="classNames?.label" :style="showLabels ? undefined : SR_ONLY_STYLE">
      {{ maxLabel }}
    </label>
    <input
      :id="maxDomId"
      type="number"
      :class="classNames?.input"
      :value="current.max ?? ''"
      :min="bounds?.min"
      :max="bounds?.max"
      @change="onMax" />
  </div>
</template>

<script setup lang="ts">
import { useId } from 'vue'
import { useRange } from '../connectors/useRange'
import { SR_ONLY_STYLE } from '../utils/srOnly'
import type { ClassNames } from '../types'

type Props = {
  attribute: string
  label: string
  classNames?: ClassNames
  minLabel?: string
  maxLabel?: string
  showLabels?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  classNames: undefined,
  minLabel: 'Min',
  maxLabel: 'Max',
  showLabels: true
})

const minDomId = useId()
const maxDomId = useId()
const { bounds, current, refine } = useRange({ attribute: props.attribute })

const parse = (value: string): number | undefined => {
  if (value.trim() === '') return undefined
  const parsed = Number(value)
  return Number.isNaN(parsed) ? undefined : parsed
}

const onMin = (event: Event) => {
  if (event.target instanceof HTMLInputElement) refine({ min: parse(event.target.value), max: current.value.max })
}
const onMax = (event: Event) => {
  if (event.target instanceof HTMLInputElement) refine({ min: current.value.min, max: parse(event.target.value) })
}
</script>
