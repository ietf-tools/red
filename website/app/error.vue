<!-- error.vue -->
<template>
  <div class="flex flex-col min-h-[100vh]">
    <div>
      <Header />
    </div>
    <main class="flex-1 pt-10 pb-20 text-center max-w-100 mx-auto">
      <h1 class="text-5xl">Error {{ props.error.status ?? props.error.statusCode }}</h1>
      <p class="mt-4">{{ props.error.message ?? props.error.statusMessage }}</p>
      <ul class="pt-4 pl-6 flex flex-col gap-3">
        <li>
          <a :href="HOME_PATH" :class="[ANCHOR_COLOR_TAILWIND_STYLE, 'underline']" @click="handleHomepage">
            Go to homepage.
          </a>
        </li>
        <li>
          or
          <a :href="SEARCH_PATH" :class="[ANCHOR_COLOR_TAILWIND_STYLE, 'underline']" @click="handleSearch">
            go to search.
          </a>
        </li>
      </ul>
    </main>
    <Footer />
  </div>
</template>

<script setup lang="ts">
import type { NuxtError } from '#app'
import {
  isFeatureFlagsModalVisibleKey,
  featureFlagsKey,
  loadFeatureFlagsFromLocalStorage,
  DEFAULT_FEATURE_FLAGS,
  type FeatureFlags
} from './utilities/feature-flags'
import { ANCHOR_COLOR_TAILWIND_STYLE } from './utilities/theme'
import { HOME_PATH, SEARCH_PATH } from './utilities/url'

type Props = {
  error: NuxtError
}
const props = defineProps<Props>()

const handleHomepage = (e: Event) => {
  e.preventDefault?.()
  clearError({ redirect: HOME_PATH })
}

const handleSearch = (e: Event) => {
  e.preventDefault?.()
  clearError({ redirect: SEARCH_PATH })
}

const isFeatureFlagsModalVisible = ref(false)
const featureFlagsRef = ref<FeatureFlags>(DEFAULT_FEATURE_FLAGS)
provide(isFeatureFlagsModalVisibleKey, isFeatureFlagsModalVisible)
provide(featureFlagsKey, featureFlagsRef)
onMounted(() => loadFeatureFlagsFromLocalStorage(featureFlagsRef))
</script>
