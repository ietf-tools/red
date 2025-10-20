<template>
  <svg
    :width="props.width"
    :height="props.height"
    viewBox="0 0 11 7"
    xmlns="http://www.w3.org/2000/svg"
    :class="['motion-safe:transition-all', props.class]"
    aria-hidden="true"
    fill="currentColor"
  >
    <path
      d="M10.6262 1.34174L9.58022 0.334155C9.38658 0.14762 9.08009 0.14762 8.88645 0.334154L5.84688 3.26218C5.65324 3.44871 5.34676 3.44871 5.15312 3.26218L2.11355 0.334154C1.91991 0.14762 1.61342 0.14762 1.41978 0.334155L0.373816 1.34174C0.169662 1.5384 0.169662 1.86527 0.373816 2.06193L5.15311 6.66585C5.34676 6.85238 5.65324 6.85238 5.84688 6.66585L10.6262 2.06193C10.8303 1.86527 10.8303 1.5384 10.6262 1.34174Z"
    />
  </svg>
</template>

<script setup lang="ts">
import type { VueStyleClass } from '~/utilities/vue'

type Props = {
  width?: string
  height?: string
  class?: VueStyleClass
}

const props = withDefaults(defineProps<Props>(), {
  width: '11',
  height: '7'
})
</script>
