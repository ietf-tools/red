<template>
  <fieldset>
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
</script>
