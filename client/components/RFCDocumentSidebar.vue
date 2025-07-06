<template>
  <div class="h-full print:block">
    <DialogRoot v-model:open="isModalOpen" @close="isModalOpen = false">
      <DialogTrigger />
      <DialogPortal>
        <DialogOverlay />
        <DialogContent :class="// needs overflow-y-scroll to force scrollbars, to ensure same page width as the main view
          'absolute inset-0 z-50 bg-blue-900 text-white dark:bg-blue-950 dark:text-white overflow-y-scroll h-full'">
          <DialogTitle />
          <DialogDescription>
            <RFCMobileBanner :rfc="props.rfc" :rfc-bucket-html-doc="props.rfcBucketHtmlDoc" :is-fixed="false">
              <button class="bg-white rounded-l text-black p-2 flex items-center" aria-label="Close"
                @click="isModalOpen = false">
                <GraphicsExpandSidebar class="inline-block mr-1 rotate-180" />
              </button>
            </RFCMobileBanner>
            <div class="px-2">
              <RFCTabs ref="mobileRFCTabs" v-model:selected-tab="selectedTab" :rfc="props.rfc"
                :rfc-bucket-html-doc="props.rfcBucketHtmlDoc" />
            </div>
          </DialogDescription>
          <DialogClose />
        </DialogContent>
      </DialogPortal>
    </DialogRoot>

    <div class="sticky top-0 h-screen flex flex-col border-2 justify-between border-green-300">
      <div class="">top thing <br /> more thing <br /> more thing </div>
      <TableOfContentsHighlight :toc="props.rfcBucketHtmlDoc.tableOfContents!" list-type="ordered"
        wrapper-class="flex-1 pb-2" list-class="mr-1" nested-list-class="pl-5"
        :list-item-class="`block text-sm py-2 border-t-1 border-t-gray-300 dark:border-t-gray-500 no-underline hover:underline ${ANCHOR_TAILWIND_STYLE}`"
        list-item-active-class="text-shadow-bold">
        <Heading level="2" style-level="5" class="mb-1 text-gray-800 dark:text-gray-300">
          In this section
        </Heading>
      </TableOfContentsHighlight>
    </div>

    <!-- <div class="sticky top-0 h-[100vh] overflow-y-scroll">
      <RFCTabs
        ref="desktopRFCTabs"
        v-model:selected-tab="selectedTab"
        :rfc="props.rfc"
        :rfc-bucket-html-doc="props.rfcBucketHtmlDoc"
      />
    </div> -->
  </div>
</template>

<script setup lang="ts">
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
  DialogTrigger
} from 'reka-ui'
import type { RfcBucketHtmlDocument, RfcCommon } from '~/utilities/rfc'
import { ANCHOR_TAILWIND_STYLE } from '~/utilities/theme'

type Props = {
  rfc: RfcCommon
  rfcBucketHtmlDoc: RfcBucketHtmlDocument
  gotoErrata: () => void
}

const isModalOpen = defineModel<boolean>('isModalOpen')

const selectedTab = defineModel<number>('selectedTab')

const props = defineProps<Props>()
</script>
