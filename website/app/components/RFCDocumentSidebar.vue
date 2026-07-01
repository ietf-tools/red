<template>
  <div class="h-full flex-1 print:block">
    <DialogRoot v-model:open="isModalOpen" @close="isModalOpen = false">
      <DialogPortal>
        <DialogOverlay />
        <DialogContent
          :class="[
            'overflow-y-scroll', // needs overflow-y-scroll to force scrollbars, to ensure same page width as the main view
            'fixed inset-0 z-50 bg-blue-900 dark:bg-blue-950 h-full'
          ]"
          :aria-describedby="undefined">
          <DialogClose aria-label="Close menu" class="absolute right-0 top-0 px-5 py-5">
            <GraphicsClose class="text-white" />
          </DialogClose>
          <DialogTitle as="h1" class="px-2 py-4 text-white dark:text-white">
            <RFCTitle :rfc="props.rfcBucketHtmlDocument.rfc" />
          </DialogTitle>
          <nav aria-label="In this RFC (mobile menu)" class="bg-white dark:bg-blue-900">
            <RFCTabs
              v-model="selectedTab"
              mode="mobile"
              :rfc-bucket-html-document="props.rfcBucketHtmlDocument"
              :has-table-of-contents="props.hasTableOfContents" />
          </nav>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>

    <nav
      aria-label="In this RFC (desktop menu)"
      :class="['flex flex-col', isMounted && 'sticky top-0 h-[calc(100vh)]']">
      <RFCTabs
        v-model="selectedTab"
        mode="desktop"
        :rfc-bucket-html-document="props.rfcBucketHtmlDocument"
        :has-table-of-contents="props.hasTableOfContents" />
    </nav>
  </div>
</template>

<script setup lang="ts">
import { DialogClose, DialogContent, DialogOverlay, DialogPortal, DialogRoot, DialogTitle } from 'reka-ui'
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

const isMounted = ref(false)

onMounted(() => (isMounted.value = true))

provide(closeModalAndScrollToId, handleCloseAndNavigate)
</script>
