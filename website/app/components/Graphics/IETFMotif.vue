<template>
  <svg
    :width.attr="props.width"
    :height.attr="props.height"
    viewBox="0 0 473.88 250.932"
    xmlns="http://www.w3.org/2000/svg"
    :class="['pointer-events-none', props.class]"
    fill="currentColor"
    aria-hidden="true">
    <g :opacity="props.opacity">
      <path
        d="M210.825-45.607 0 164.985l84.057 83.872 210.829-210.4ZM166.085 181.359 300.892 47.186l83.518 84.608L250.3 265.762ZM315.613 215.601l74.58-74.334 83.687 83.66-73.607 74.11z" />
    </g>
  </svg>
</template>

<script setup lang="ts">
import type { VueStyleClass } from '~/utilities/vue'

type Props = {
  width?: number
  height?: number
  class?: VueStyleClass
  opacity?: number
}

const defaultWidth = 20

const svgWidthHeightRatio = 1.371559633027523

const props = withDefaults(defineProps<Props>(), {
  width: defaultWidth,
  height: defaultWidth / svgWidthHeightRatio,
  opacity: 1
})
</script>
