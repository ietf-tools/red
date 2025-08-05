<template>
  <span
    :class="['inline-block bg-white dark:bg-black shadow-sm outline-1 rounded-xs outline-gray-400 hover:outline-black dark:hover:outline-gray-300 focus-within:ring-black focus-within:ring-offset-3 focus-within:ring-1', props.class]"
  >
    <select
      v-bind="$attrs"
      :class="['focus:ring-none focus:outline-none py-2 mx-2', props.selectClass]"
    >
      <slot />
    </select>
  </span>
</template>

<script setup lang="ts">
/**
 * A <select> that appears to have internal padding so that the native <select> dropdown icon 'v' will be padded from
 * the edge.
 *
 * This works by disabling the native <select> focus ring, and using 'focus-within' from a container with spacing.
 *
 * Usage of this component should wrap it in a <label> because the area outside the <select> isn't focusable, but the
 * <label> will make it so.
 */

import type { VueStyleClass } from '~/utilities/vue'

type Props = {
  class?: VueStyleClass
  selectClass?: VueStyleClass
}

const props = defineProps<Props>()
</script>
