<template>
  <RFCCard
    v-if="density === 'full'"
    heading-level="3"
    :rfc="rfc"
    :show-abstract="true"
    :show-tag-date="true"
  />
  <RFCCardDense v-else-if="density === 'dense'" heading-level="3" :rfc="rfc" />
  <RFCCardCompact
    v-else-if="density === 'compact'"
    heading-level="3"
    :rfc="rfc"
  />
</template>

<script setup lang="ts">
import { typeSenseSearchItemToRFCCommon } from '~/utilities/rfc-converters'
import type { Density, TypeSenseSearchItem } from '~/utilities/typesense'

type Props = {
  typeSenseSearchItem: TypeSenseSearchItem
  density: Density
}

const props = defineProps<Props>()

const rfc = computed(() =>
  typeSenseSearchItemToRFCCommon(props.typeSenseSearchItem)
)
</script>
