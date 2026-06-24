<template>
  <div
    :class="[
      'border rounded border-l-4 px-3 py-2 my-5 print:border-black print:bg-white',
      {
        'bg-pink-100 dark:bg-red-950 border-red-600': props.variant === 'warning',
        'bg-white dark:bg-yellow-950 border-yellow-400': props.variant === 'info'
      }
    ]">
    <slot />
  </div>
</template>

<script setup lang="ts">
import type { Variant } from '~/utilities/alert'

type Props = {
  variant: Variant
}

const props = defineProps<Props>()
</script>
