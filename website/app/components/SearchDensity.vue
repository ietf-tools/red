<template>
  <DensityToggle v-model="value" legend="Display results as" :options="OPTIONS" />
</template>

<script lang="ts" setup>
import type { DensityOption } from '~/utilities/density'
import type { Density } from '~/utilities/typesense'

const value = defineModel<Density>()

const OPTIONS: DensityOption<Density>[] = [
  { value: 'full', label: 'Full Display', icon: 'f7:rectangle-grid-1x2-fill' },
  { value: 'dense', label: 'Dense Display', icon: 'fa-solid:th-list' },
  { value: 'compact', label: 'Compact Display', icon: 'vaadin:list' }
]
</script>
