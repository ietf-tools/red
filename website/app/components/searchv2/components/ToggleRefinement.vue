<template>
  <label :class="classNames?.root">
    <input type="checkbox" :class="classNames?.checkbox" :checked="value" @change="onChange" />
    <slot :value="value">{{ label }}</slot>
  </label>
</template>

<script setup lang="ts">
import { useToggleRefinement } from '../connectors/useToggleRefinement'
import type { ClassNames } from '../types'

type Props = {
  attribute: string
  label?: string
  classNames?: ClassNames
}

const props = defineProps<Props>()

const { value, refine } = useToggleRefinement({ attribute: props.attribute })

const onChange = (event: Event) => {
  if (event.target instanceof HTMLInputElement) refine(event.target.checked)
}
</script>
