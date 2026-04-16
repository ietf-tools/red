<template>
  <div class="h-full flex-1 print:block">
    <DialogRoot
      v-model:open="isModalOpen"
      @close="isModalOpen = false"
    >
      <DialogPortal>
        <DialogOverlay />
        <DialogContent :class="// needs overflow-y-scroll to force scrollbars, to ensure same page width as the main view
          'fixed inset-0 z-50 bg-blue-900 dark:bg-blue-950 overflow-y-scroll h-full'">
          <DialogTitle />

          <RFCMobileBanner
            :rfc="props.rfcBucketHtmlDocument.rfc"
            :is-fixed="false"
          >
            <button
              class="bg-white rounded-l text-black p-2 flex items-center"
              aria-label="Close"
              @click="isModalOpen = false"
            >
              <GraphicsExpandSidebar class="inline-block mr-1 rotate-180" />
            </button>
          </RFCMobileBanner>
          <div class="bg-white dark:bg-blue-900">
            <RFCTabs
              v-model="selectedTab"
              mode="mobile"
              :rfc-bucket-html-document="props.rfcBucketHtmlDocument"
              :has-table-of-contents="props.hasTableOfContents"
            />
          </div>
          <DialogClose />
        </DialogContent>
      </DialogPortal>
    </DialogRoot>

    <div class="sticky top-0 h-[calc(100vh)] w-[300px] flex flex-col">
      <RFCTabs
        v-model="selectedTab"
        mode="desktop"
        :rfc-bucket-html-document="props.rfcBucketHtmlDocument"
        :has-table-of-contents="props.hasTableOfContents"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  DialogClose,
  DialogContent,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from 'reka-ui'
import type { RfcBucketHtmlDocument } from '~/utilities/rfc'
import { closeModalAndScrollToId } from '~/utilities/tableOfContents'

type Props = {
  rfcBucketHtmlDocument: RfcBucketHtmlDocument
  gotoErrata: () => void
  hasTableOfContents: boolean
}

const isModalOpen = defineModel<boolean>('isModalOpen')

const selectedTab = defineModel<number>('selectedTab')

const props = defineProps<Props>()

const handleCloseAndNavigate = (id: string) => {
  isModalOpen.value = false
  nextTick(() => {
    // nextTick() because we need to wait for the modal to render closed, and then attempt to scroll
    window.location.hash = id
  })
}

provide(closeModalAndScrollToId, handleCloseAndNavigate)
</script>