<template>
  <HorizontalScrollable class="absolute left-0">
    <slot />
  </HorizontalScrollable>
  <div :style="`width: 1px; height: ${props.childHeightPx + BUFFER_HEIGHT_PX}px`"></div>
</template>

<script setup lang="ts">
type Props = {
  childWidthPx: number
  childHeightPx: number
}
const BUFFER_HEIGHT_PX = 16
const props = defineProps<Props>()
</script>
