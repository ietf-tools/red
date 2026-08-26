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
      @focus.capture="handleDesktopRFCTabsFocus"
      @wheel.capture="debouncedDesktopRFCTabsCenterOnScreen">
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

onMounted(() => {
  isMounted.value = true
})

const desktopRFCTabsCenterOnScreen = () => {
  const { value: navDesktopMenu } = navDesktopMenuRef
  if (!navDesktopMenu) {
    console.error('[internal error] expected nav-desktop-menu to be available')
    return
  }
  const { top } = navDesktopMenu.getBoundingClientRect()
  const { scrollY } = window
  const targetY = scrollY + top
  if (scrollY >= targetY) {
    // Already scrolled past the menu's document position: it is stuck to the top of
    // the viewport and fully visible, so there is nothing to centre.
    return
  }
  navDesktopMenu.scrollIntoView({ behavior: prefersReducedMotion() ? 'instant' : 'smooth' })
}

/**
 * This is intentionally laggy, as it must not affect page scrolling
 * of someone clicking a TOC link.
 * If this is reduced to a small number it can clobber scroll position
 */
const CENTER_ON_SCREEN_TIMER_MS = 500

const debouncedDesktopRFCTabsCenterOnScreen = useDebounceFn(desktopRFCTabsCenterOnScreen, CENTER_ON_SCREEN_TIMER_MS)

/**
 * Centring on focus is for readers who arrive at the menu by keyboard — tabbing into
 * a ToC link that sits below the fold should bring the menu into view.
 *
 * A mouse click on a ToC link also focuses it, but that reader is navigating *away*
 * from the menu, and centring would fight the anchor scroll: the smooth scroll back
 * up to the menu outlives the click's jump to the heading, so the page lands at the
 * menu instead of the section.
 *
 * `:focus-visible` is exactly that distinction — a link matches it when focused by
 * keyboard and not when focused by pointer — so it closes the window entirely rather
 * than relying on the debounce out-waiting the click.
 */
const handleDesktopRFCTabsFocus = (event: FocusEvent) => {
  const { target } = event
  if (target instanceof Element && !target.matches(':focus-visible')) {
    return
  }
  debouncedDesktopRFCTabsCenterOnScreen()
}

provide(closeModalAndScrollToId, handleCloseAndNavigate)
</script>
