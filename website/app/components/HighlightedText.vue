<template>
  <!-- No v-html: the ranges come from what a reader typed into a filter box, so the text is handed
     to the template as segments to loop over rather than assembled into markup. `mark` is the
     element for a run highlighted because it is relevant to what the reader is doing, which is
     exactly this; it is styled in assets/css/tailwind.css, including for forced colours, where a
     background alone would be stripped and the highlight would silently vanish. -->
  <template v-for="(segment, index) in segments" :key="index"
    ><mark v-if="segment.isMatch">{{ segment.text }}</mark
    ><template v-else>{{ segment.text }}</template></template
  >
</template>

<script setup lang="ts">
import { segmentsOf, type TextRange } from '~/utilities/subject-search'

const { text, ranges } = defineProps<{
  text: string
  ranges: TextRange[]
}>()

const segments = computed(() => segmentsOf(text, ranges))
</script>
