<template>
  <HorizontalScrollable :inner-class="props.innerClass">
    <slot />
  </HorizontalScrollable>
</template>

<script setup lang="ts">
import type { VueStyleClass } from '~/utilities/vue'

type Props = {
  childWidthAttr: string // a string like `10px' or '6ex'
  childHeightAttr: string // a string like `10px' or '6ex'
  class?: VueStyleClass
  innerClass?: VueStyleClass
}

const props = defineProps<Props>()
</script>
