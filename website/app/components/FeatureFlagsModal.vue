<template>
  <DialogRoot v-model:open="isFeatureFlagsModalVisible">
    <DialogPortal>
      <DialogOverlay
        class="bg-blue-900/50 data-[state=open]:animate-overlayShow fixed inset-0 z-110 overflow-y-scroll py-16">
        <DialogContent
          class="data-[state=open]:animate-contentShow mx-auto w-[90vw] max-w-[800px] relative rounded-md bg-white dark:bg-blue-900 px-5 pt-3 pb-5 z-[100]">
          <DialogTitle as="h1" class="text-xl font-bold py-2 pr-16">
            RFC-Editor.org Feature Flag Experiments
          </DialogTitle>
          <DialogDescription
            as="div"
            class="w-full leading-6 pb-3 flex flex-row border-b-1 border-b-gray-300 dark:border-b-gray-600">
            <p class="flex-2 text-balance">
              <b class="text-red-800 dark:text-red-400">Warning: </b> This config panel is intended for a specific
              audience. It is for those interested in using experimental features of the website and giving technical
              feedback. These experimental features may be buggy. You should not enable these experimental features
              unless you know what you're doing.
            </p>
            <div
              class="flex-1 text-sm bg-yellow-50 dark:bg-yellow-900 text-yellow-950 dark:text-yellow-100 ml-6 w-50 py-2 px-3">
              <Heading level="2" style-level="5">What are "feature flags"?</Heading>
              <p class="text-balance mt-1">
                Feature Flags are experimental website features that can be enabled or disabled, and they may
                <b>or may not</b> become default in the future.
              </p>
            </div>
          </DialogDescription>
          <Heading level="2" style-level="4" class="mt-4 mb-0 pb-0">Website feature flags:</Heading>
          <div class="py-3 flex flex-col gap-5 border-b-1 border-b-gray-300 dark:border-b-gray-600">
            <FeatureFlagItem
              v-for="featureFlagUIRow in featureFlagsUIRows"
              :key="featureFlagUIRow[0]"
              :feature-flag-key="featureFlagUIRow[0] as keyof FeatureFlags"
              :feature-flag-ui-row="featureFlagUIRow[1]" />
          </div>
          <p class="pt-3 text-sm">
            Your feature flag preferences will be saved to browser
            <Anchor href="https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage" class="monotype"
              >localStorage
              <GraphicsNewWindowIcon class="text-xl -mt-2 align-middle" />
            </Anchor>
            (if available). Features flags are added and removed over time and your preferences may be reset. If so,
            just set your preferences again.
          </p>
          <DialogClose
            class="absolute border-1 border-gray-400 top-4 right-5 rounded cursor-pointer px-3 py-1 focus:bg-gray-500/25 hover:bg-gray-500/25">
            Close
          </DialogClose>
        </DialogContent>
      </DialogOverlay>
    </DialogPortal>
  </DialogRoot>
</template>

<script setup lang="ts">
import { featureFlagsUIRows, isFeatureFlagsModalVisibleKey, type FeatureFlags } from '~/utilities/feature-flags'

const isFeatureFlagsModalVisible = inject(isFeatureFlagsModalVisibleKey)
</script>
