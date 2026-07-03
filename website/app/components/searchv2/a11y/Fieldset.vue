<template>
  <fieldset :style="RESET_STYLE">
    <legend :class="legendClass">
      <slot name="legend">{{ legend }}</slot>
    </legend>
    <slot />
  </fieldset>
</template>

<script setup lang="ts">
import type { ClassNames } from '../types'

type Props = {
  legend?: string
  legendClass?: ClassNames[string]
}

defineProps<Props>()

// Neutralise the browser's default fieldset border/padding so hosts style from scratch.
const RESET_STYLE = 'border:0;margin:0;padding:0;min-inline-size:0'
</script>
