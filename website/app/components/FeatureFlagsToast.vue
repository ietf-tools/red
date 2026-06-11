<template>
  <div
    v-if="areFeatureFlagsEnabled && isFeatureFlagsModalVisible === false"
    :class="[
      'fixed z-100 transition-all left-2 ',
      {
        '-top-20': !shouldShowToast,
        'top-2': shouldShowToast
      }
    ]">
    <form
      class="w-full max-w-120 mx-auto pl-3 pr-1 py-1 flex flex-row gap-5 text-sm bg-yellow-50 dark:bg-yellow-900 text-yellow-950 dark:text-yellow-100 bg-yellow-50 dark:bg-yellow-900 text-yellow-950 dark:text-yellow-100 rounded-md">
      <p class="flex-1 flex items-center"><b>Note:</b>{{ NONBREAKING_SPACE }} Feature Flag Experiments are enabled.</p>
      <button
        name="feature-flags-config"
        type="button"
        class="cursor-pointer border-1 px-2 py-1 border-yellow-900 dark:border-yellow-600 rounded hover:bg-yellow-200 focus:bg-yellow-200 dark:hover:bg-yellow-700 dark:focus:bg-yellow-700"
        @click="isFeatureFlagsModalVisible = true">
        Configure
      </button>
      <button
        name="feature-flags-close"
        type="button"
        class="cursor-pointer px-2 py-1 rounded text-black dark:text-white border-1 border-yellow-50 dark:border-yellow-900 hover:border-yellow-500 hover:bg-yellow-100 dark:hover:text-white dark:focus:text-white dark:hover:bg-black dark:focus:bg-black"
        aria-label="Close feature flags being enabled message"
        @click="shouldShowToast = false">
        <span aria-hidden> &times; </span>
      </button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { watchDebounced } from '@vueuse/core'
import { isFeatureFlagsModalVisibleKey, useAreFeatureFlagsEnabled } from '~/utilities/feature-flags'
import { NONBREAKING_SPACE } from '~/utilities/strings'

const areFeatureFlagsEnabled = useAreFeatureFlagsEnabled()
const isFeatureFlagsModalVisible = inject(isFeatureFlagsModalVisibleKey)

const shouldShowToast = ref(false)

watchDebounced(
  areFeatureFlagsEnabled,
  () => {
    shouldShowToast.value = true
  },
  {
    debounce: 200,
    maxWait: 400
  }
)
</script>
