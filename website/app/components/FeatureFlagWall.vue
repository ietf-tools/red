<template>
  <slot v-if="status === 'enabled'" />
</template>

<script setup lang="ts">
import { useFeatureFlagWall, type FeatureFlags } from '~/utilities/feature-flags'

type Props = {
  featureFlagKey: keyof FeatureFlags
}

const { featureFlagKey } = defineProps<Props>()

// Nothing is drawn while the flags are still unknown, and nothing is drawn when they say no —
// that case is on its way to the homepage instead. Both are why this renders no holding state of
// its own: a gated feature is one most readers have no business seeing a trace of, so a spinner
// or a "not available" panel would be telling them about something they cannot have.
const status = useFeatureFlagWall(() => featureFlagKey)
</script>
