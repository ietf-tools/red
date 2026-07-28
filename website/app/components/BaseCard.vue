<template>
  <div
    :class="[
      props.overrideClassDefaults,
      'relative border pl-5 pr-7 py-4 rounded shadow-xs print:border-2 print:border-black',
      props.class
    ]">
    <slot />
  </div>
</template>

<script setup lang="ts">
import type { VueStyleClass } from '../utilities/vue'

type Props = {
  class?: VueStyleClass
  overrideClassDefaults?: VueStyleClass
}

const props = withDefaults(defineProps<Props>(), {
  overrideClassDefaults: 'bg-white dark:bg-blue-950 border-gray-200 dark:border-gray-500'
})
</script>
