<template>
  <NuxtLoadingIndicator />
  <NuxtRouteAnnouncer />
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<script setup lang="ts">
import {
  isFeatureFlagsModalVisibleKey,
  featureFlagsKey,
  loadFeatureFlagsFromLocalStorage,
  DEFAULT_FEATURE_FLAGS,
  type FeatureFlags
} from '~/utilities/feature-flags'

const isFeatureFlagsModalVisible = ref(false)
const featureFlagsRef = ref<FeatureFlags>(DEFAULT_FEATURE_FLAGS)
provide(isFeatureFlagsModalVisibleKey, isFeatureFlagsModalVisible)
provide(featureFlagsKey, featureFlagsRef)
onMounted(() => loadFeatureFlagsFromLocalStorage(featureFlagsRef))
</script>
