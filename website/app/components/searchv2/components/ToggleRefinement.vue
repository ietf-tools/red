<template>
  <div :class="classNames?.root">
    <label :class="classNames?.label">
      <input
        type="checkbox"
        :class="classNames?.checkbox"
        :checked="value"
        :aria-describedby="description ? descriptionId : undefined"
        @change="onChange" />
      <slot :value="value">{{ label }}</slot>
    </label>
    <p v-if="description" :id="descriptionId" :class="classNames?.description">{{ description }}</p>
  </div>
</template>

<script setup lang="ts">
import { useId } from 'vue'
import { useToggleRefinement } from '../connectors/useToggleRefinement'
import type { ClassNames } from '../types'

type Props = {
  attribute: string
  label?: string
  /** Supplementary text linked to the checkbox via `aria-describedby`. */
  description?: string
  classNames?: ClassNames
}

const props = defineProps<Props>()

const descriptionId = useId()

const { value, refine } = useToggleRefinement({ attribute: props.attribute })

const onChange = (event: Event) => {
  if (event.target instanceof HTMLInputElement) refine(event.target.checked)
}
</script>
