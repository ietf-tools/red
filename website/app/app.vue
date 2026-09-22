<template>
  <NuxtLoadingIndicator />
  <NuxtRouteAnnouncer />
  <NuxtLayout>
    <NuxtPage />
    <Notifications />
  </NuxtLayout>
  <!-- Rendered here rather than inside NuxtLayout's slot content, which is re-parented into a
       fresh layout instance (and so unmounted/remounted) whenever navigation switches layouts. -->
  <FeatureFlagsToast />
</template>

<script setup lang="ts">
import {
  isFeatureFlagsModalVisibleKey,
  featureFlagsKey,
  hasFeatureFlagsLoadedKey,
  hasFeatureFlagsToastBeenDismissedKey,
  loadFeatureFlagsFromLocalStorage,
  DEFAULT_FEATURE_FLAGS,
  type FeatureFlags
} from '~/utilities/feature-flags'
import { initReefSurveys } from '~/utilities/reef-surveys'

const isFeatureFlagsModalVisible = ref(false)
const featureFlagsRef = ref<FeatureFlags>(DEFAULT_FEATURE_FLAGS)
const hasFeatureFlagsLoaded = ref(false)
const hasFeatureFlagsToastBeenDismissed = ref(false)
provide(isFeatureFlagsModalVisibleKey, isFeatureFlagsModalVisible)
provide(featureFlagsKey, featureFlagsRef)
provide(hasFeatureFlagsLoadedKey, hasFeatureFlagsLoaded)
provide(hasFeatureFlagsToastBeenDismissedKey, hasFeatureFlagsToastBeenDismissed)
onMounted(() => loadFeatureFlagsFromLocalStorage(hasFeatureFlagsLoaded, featureFlagsRef))
onMounted(initReefSurveys)
</script>
