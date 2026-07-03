<template>
  <div :class="classNames?.root" role="status" aria-live="polite" aria-atomic="true">
    <slot :nb-hits="nbHits" :processing-time-ms="processingTimeMS" :query="query">{{ defaultText }}</slot>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useStats } from '../connectors/useStats'
import type { ClassNames } from '../types'

type Props = {
  classNames?: ClassNames
  /** Words used in the default count text (singular / plural); override for wording or localisation. */
  resultLabel?: string
  resultsLabel?: string
}

const props = withDefaults(defineProps<Props>(), {
  classNames: undefined,
  resultLabel: 'result',
  resultsLabel: 'results'
})

const { nbHits, processingTimeMS, query } = useStats()

const defaultText = computed(
  () => `${nbHits.value.toLocaleString()} ${nbHits.value === 1 ? props.resultLabel : props.resultsLabel}`
)
</script>
