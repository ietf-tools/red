<template>
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="currentColor"
    role="img"
    aria-hidden="true"
    :class="props.class"
  >
    <title>Expand sidebar</title>
    <path
      d="M4.94598 8.47687L8.16206 11.8124C8.28266 11.9375 8.44347 12 8.60427 12C8.78518 12 8.94598 11.9375 9.06658 11.8124C9.32789 11.5622 9.32789 11.1244 9.06658 10.8743L6.95603 8.66449H13.1068C13.4686 8.66449 13.75 8.37264 13.75 7.99739C13.75 7.643 13.4686 7.33029 13.1068 7.33029H6.95603L9.06658 5.14137C9.32789 4.89121 9.32789 4.45342 9.06658 4.20326C8.82538 3.93225 8.40327 3.93225 8.16206 4.20326L4.94598 7.53876C4.68467 7.78892 4.68467 8.22671 4.94598 8.47687Z"
    />
    <rect width="1.5" height="10" transform="matrix(-1 0 0 1 3.75 3)" />
  </svg>
</template>

<script setup lang="ts">
import type { VueStyleClass } from '~/utilities/vue'

type Props = {
  class?: VueStyleClass
}

const props = defineProps<Props>()
</script>
