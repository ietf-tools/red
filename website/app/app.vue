<template>
  <NuxtLoadingIndicator />
  <NuxtRouteAnnouncer />
  <NuxtLayout>
    <NuxtPage />
    <Notifications />
  </NuxtLayout>
</template>

<script setup lang="ts">
import {
  isFeatureFlagsModalVisibleKey,
  featureFlagsKey,
  hasFeatureFlagsLoadedKey,
  loadFeatureFlagsFromLocalStorage,
  DEFAULT_FEATURE_FLAGS,
  type FeatureFlags
} from '~/utilities/feature-flags'

const isFeatureFlagsModalVisible = ref(false)
const featureFlagsRef = ref<FeatureFlags>(DEFAULT_FEATURE_FLAGS)
const hasFeatureFlagsLoaded = ref(false)
provide(isFeatureFlagsModalVisibleKey, isFeatureFlagsModalVisible)
provide(featureFlagsKey, featureFlagsRef)
provide(hasFeatureFlagsLoadedKey, hasFeatureFlagsLoaded)
onMounted(() => loadFeatureFlagsFromLocalStorage(hasFeatureFlagsLoaded, featureFlagsRef))
</script>
