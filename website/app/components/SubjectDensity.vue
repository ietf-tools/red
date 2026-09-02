<template>
  <DensityToggle v-model="value" legend="Display subjects as" :options="OPTIONS" />
</template>

<script lang="ts" setup>
import type { SubjectDensity } from '~/stores/ui-settings'
import type { DensityOption } from '~/utilities/density'

const value = defineModel<SubjectDensity>()

// The ends of the same scale the search density control offers, drawn with the same two icons so
// the two toggles read as one idea. There is no middle state to draw here: a subject is a name and
// a description, so the only thing density can trade away is the description.
const OPTIONS: DensityOption<SubjectDensity>[] = [
  { value: 'full', label: 'Full display (with descriptions)', icon: 'f7:rectangle-grid-1x2-fill' },
  { value: 'compact', label: 'Compact display (names only)', icon: 'vaadin:list' }
]
</script>
