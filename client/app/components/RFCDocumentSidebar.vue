<template>
  <div class="h-full print:block">
    <DialogRoot
      v-model:open="isModalOpen"
      @close="isModalOpen = false"
    >
      <DialogTrigger />
      <DialogPortal>
        <DialogOverlay />
        <DialogContent :class="// needs overflow-y-scroll to force scrollbars, to ensure same page width as the main view
          'fixed inset-0 z-50 bg-blue-900 text-white dark:bg-blue-950 dark:text-white overflow-y-scroll h-full'">
          <DialogTitle />

          <RFCMobileBanner
            :rfc="props.rfc"
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
              ref="mobileRFCTabs"
              v-model="selectedTab"
              :rfc="props.rfc"
              :is-mobile="true"
              :rfc-bucket-html-document="props.rfcBucketHtmlDocument"
              :has-table-of-contents="props.hasTableOfContents"
            />
          </div>
          <DialogClose />
        </DialogContent>
      </DialogPortal>
    </DialogRoot>

    <div class="sticky top-0 h-[calc(100vh)] flex flex-col">
      <RFCTabs
        ref="desktopRFCTabs"
        v-model="selectedTab"
        :rfc="props.rfc"
        :is-mobile="true"
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
  DialogTrigger
} from 'reka-ui'
import type { RfcBucketHtmlDocument, RfcCommon } from '~/utilities/rfc'
import { closeModalAndScrollToId } from '~/utilities/tableOfContents'

type Props = {
  rfc: RfcCommon
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