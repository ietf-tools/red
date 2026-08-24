<template>
  <div class="h-full flex-1 print:block">
    <DialogRoot v-model:open="isModalOpen" @close="isModalOpen = false">
      <DialogPortal>
        <DialogOverlay />
        <DialogContent
          :class="[
            'overflow-y-scroll', // needs overflow-y-scroll to force scrollbars, to ensure same page width as the main view
            'fixed inset-0 z-100 bg-blue-900 dark:bg-blue-950 h-full'
          ]"
          :aria-describedby="undefined">
          <DialogClose aria-label="Close menu" class="absolute right-0 top-0 px-5 py-5">
            <GraphicsClose class="text-white" />
          </DialogClose>
          <DialogTitle as="h1" class="pl-2 pr-12 pt-4 pb-4 text-white dark:text-white">
            <RFCTitle :rfc="props.rfcBucketHtmlDocument.rfc" has-trailing-colon />
          </DialogTitle>
          <nav aria-label="In this RFC (mobile menu)" class="bg-white dark:bg-blue-950">
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
      ref="nav-desktop-menu"
      aria-label="In this RFC (desktop menu)"
      :class="['flex flex-col', isMounted && 'sticky top-0 h-[calc(100vh)]']"
      @focus.capture="debouncedCenterOnScroll"
      @wheel.capture="debouncedCenterOnScroll">
      <RFCTabs
        v-model="selectedTab"
        mode="desktop"
        :rfc-bucket-html-document="props.rfcBucketHtmlDocument"
        :has-table-of-contents="props.hasTableOfContents" />
    </nav>
  </div>
</template>

<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core'
import { DialogClose, DialogContent, DialogOverlay, DialogPortal, DialogRoot, DialogTitle } from 'reka-ui'
import { prefersReducedMotion } from '~/utilities/accessibility'
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

const navDesktopMenuRef = useTemplateRef<HTMLElement>('nav-desktop-menu')

const handleCloseAndNavigate = (id: string) => {
  isModalOpen.value = false
  nextTick(() => {
    // nextTick() because we need to wait for the modal to render closed, and then attempt to scroll
    window.location.hash = id
  })
}

const isMounted = ref(false)

onMounted(() => (isMounted.value = true))

const centerOnScroll = () => {
  const { value: navDesktopMenu } = navDesktopMenuRef
  if (!navDesktopMenu) {
    console.error('[internal error] expected nav-desktop-menu to be available')
    return
  }
  navDesktopMenu.scrollIntoView({ behavior: prefersReducedMotion() ? 'instant' : 'smooth' })
}

const CENTER_ON_SCROLL_TIMER_MS = 30

const debouncedCenterOnScroll = useDebounceFn(centerOnScroll, CENTER_ON_SCROLL_TIMER_MS)

provide(closeModalAndScrollToId, handleCloseAndNavigate)
</script>
