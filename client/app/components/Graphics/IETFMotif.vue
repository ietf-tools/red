<template>
  <svg
    :width="props.width"
    :height="props.height"
    viewBox="0 0 475.29364 346.05695"
    xmlns="http://www.w3.org/2000/svg"
    :class="['pointer-events-none', props.class]"
    fill="currentColor"
    aria-hidden="true"
  >
    <g :opacity="props.opacity">
      <path
        d="M 216.6199,2.4865995 5.794542,213.0781 89.851776,296.95018 300.68055,86.550968 Z"
      />
      <path
        d="M 171.87956,229.45199 306.68695,95.278897 390.20493,179.88715 256.09455,313.8555 Z"
      />
      <path
        d="m 321.40782,263.69426 74.58039,-74.33433 83.68632,83.66101 -73.60691,74.10996 z"
      />
    </g>
  </svg>
</template>

<script setup lang="ts">
import type { VueStyleClass } from '~/utilities/vue'

type Props = {
  width?: string
  height?: string
  class?: VueStyleClass
  opacity?: number
}

const props = withDefaults(defineProps<Props>(), {
  width: '20',
  height: '20',
  opacity: 1
})
</script>
