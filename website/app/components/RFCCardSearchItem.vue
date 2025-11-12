<template>
  <RFCCard
    v-if="density === 'full'"
    heading-level="3"
    :rfc="props.rfc"
    :show-abstract="true"
    :show-tag-date="true"
  />
  <RFCCardDense v-else-if="density === 'dense'" heading-level="3" :rfc="props.rfc" />
  <RFCCardCompact
    v-else-if="density === 'compact'"
    heading-level="3"
    :rfc="props.rfc"
  />
</template>

<script setup lang="ts">
import type { RfcCommon } from '~/utilities/rfc-validators'
import type { Density } from '~/utilities/typesense'

type Props = {
  rfc: RfcCommon
  density: Density
}

const props = defineProps<Props>()
</script>
