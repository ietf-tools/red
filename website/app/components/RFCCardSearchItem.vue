<template>
  <RFCCard
    v-if="density === 'full'"
    heading-level="3"
    :rfc="props.rfc"
    :show-abstract="true"
    :show-tag-date="true"
    :reef-stats="props.reefStats" />
  <RFCCardDense v-else-if="density === 'dense'" heading-level="3" :rfc="props.rfc" :reef-stats="props.reefStats" />
  <RFCCardCompact v-else-if="density === 'compact'" heading-level="3" :rfc="props.rfc" :reef-stats="props.reefStats" />
</template>

<script setup lang="ts">
import type { ReefRFCStats, RfcCommon } from '~/utilities/rfc-validators'
import type { Density } from '~/utilities/typesense'

type Props = {
  rfc: RfcCommon
  density: Density
  reefStats?: ReefRFCStats
}

const props = defineProps<Props>()
</script>
