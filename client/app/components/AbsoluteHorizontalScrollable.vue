<template>
  <HorizontalScrollable class="absolute left-0">
    <slot />
  </HorizontalScrollable>
  <div :style="`width: 1px; height: calc(${props.childHeightAttr} + ${BUFFER_HEIGHT_PX}px)`"></div>
</template>

<script setup lang="ts">
type Props = {
  childWidthAttr: string // a string like `10px' or '6ex'
  childHeightAttr: string // a string like `10px' or '6ex'
}
const BUFFER_HEIGHT_PX = 16
const props = defineProps<Props>()
</script>
