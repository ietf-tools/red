<template>
  <DensityToggle v-model="value" legend="Display RFCs as" :options="OPTIONS" />
</template>

<script lang="ts" setup>
import type { Density } from '~/utilities/typesense'
import type { DensityOption } from '~/utilities/density'

const value = defineModel<Density>()

// The same scale and icons as the search density control, so the two toggles read as one idea:
// this one just trades RFCCard for RFCCardDense/RFCCardCompact instead of Typesense results.
const OPTIONS: DensityOption<Density>[] = [
  { value: 'full', label: 'Full Display', icon: 'f7:rectangle-grid-1x2-fill' },
  { value: 'dense', label: 'Dense Display', icon: 'fa-solid:th-list' },
  { value: 'compact', label: 'Compact Display', icon: 'vaadin:list' }
]
</script>
