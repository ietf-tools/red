<template>
  <AlertBox :variant="props.variant">
    <slot name="beforeHeading" />
    <Heading
      :level="props.level"
      style-level="4"
      :class="{
        'print:border-black print:text-black': true,
        'text-red-700 dark:text-red-200': props.variant === 'warning',
        'text-yellow-800 dark:text-yellow-300': props.variant === 'info'
      }">
      {{ props.heading }}
    </Heading>
    <slot />
  </AlertBox>
</template>

<script setup lang="ts">
import type { HeadingLevel } from '~/utilities/html'
import type { Variant } from '~/utilities/alert'

type Props = {
  level?: HeadingLevel
  variant: Variant
  heading: string
}

const props = withDefaults(defineProps<Props>(), { level: '2' })
</script>
