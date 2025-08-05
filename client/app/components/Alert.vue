<template>
  <div
    :class="{
      'border rounded border-l-4 px-3 py-2 my-5 print:border-black print:bg-white': true,
      'bg-pink-100 dark:bg-red-950 border-red-600': props.variant === 'warning',
      'bg-white dark:bg-yellow-950 border-yellow-400': props.variant === 'info'
    }"
  >
    <Heading
      :level="props.level"
      style-level="4"
      :class="{
        'print:border-black print:text-black': true,
        'text-red-700 dark:text-red-200': props.variant === 'warning',
        'text-yellow-750 dark:text-yellow-300': props.variant === 'info'
      }"
    >
      {{ props.heading }}
    </Heading>
    <slot />
  </div>
</template>

<script setup lang="ts">
import type { HeadingLevel } from '~/utilities/html'

type Props = {
  level?: HeadingLevel
  variant: 'warning' | 'info'
  heading: string
}

const props = withDefaults(defineProps<Props>(), { level: '2' })
</script>
