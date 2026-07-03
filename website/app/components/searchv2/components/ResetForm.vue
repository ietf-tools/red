<template>
  <button type="button" :class="classNames?.root" :disabled="!canReset" @click="onClick">
    <slot :can-reset="canReset">{{ label }}</slot>
  </button>
</template>

<script setup lang="ts">
import { useResetForm } from '../connectors/useResetForm'
import type { ClassNames, UiState } from '../types'

type Props = {
  defaults?: UiState
  label?: string
  classNames?: ClassNames
}

const props = withDefaults(defineProps<Props>(), {
  defaults: undefined,
  label: 'Reset',
  classNames: undefined
})

// Emitted after a reset so the host can move focus to a predictable location.
const emit = defineEmits<{ reset: [] }>()

const { canReset, reset } = useResetForm({ defaults: props.defaults })

const onClick = () => {
  reset()
  emit('reset')
}
</script>
