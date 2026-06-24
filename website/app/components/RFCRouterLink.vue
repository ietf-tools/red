<template>
  <PopoverRoot v-model:open="isPopoverOpen">
    <PopoverTrigger as-child>
      <a
        v-if="props.href?.startsWith('#')"
        :href="props.href"
        :id="props.id"
        data-is-hash-link
        v-bind="popoverAttributes">
        <slot />
      </a>
      <a v-else-if="isOutsideNuxtLink(props.href)" :href="props.href" data-is-outside-nuxt v-bind="popoverAttributes">
        <slot />
      </a>
      <NuxtLink v-else :id="props.id" :to="props.href" data-is-nuxt-link v-bind="popoverAttributes">
        <slot />
      </NuxtLink>
    </PopoverTrigger>
    <PopoverPortal>
      <!--
        Hover/focus preview popover, modelled on Wikipedia's page previews: it opens
        on hover or keyboard focus after a short delay, is non-modal, and never steals
        focus. Accessibility notes:
        - @open-auto-focus is cancelled (preventFocusSteal) so opening on focus does
          NOT move focus off the article link. Keyboard users opt into the card by
          pressing Tab; we never steal focus.
        - The Tab "tether" (onTriggerKeydown to enter, the focus-guard sentinels
          below to exit) restores the tab sequence Reka does not splice across the
          portal: Tab from the link enters the card; Tab/Shift+Tab at its edges land
          on a guard and exit cleanly, regardless of how the card's links nest.
        - Reka exposes the trigger as aria-haspopup="dialog" + aria-controls and the
          content as role="dialog", so assistive tech announces and can reach the card.
        - Escape-to-dismiss + "hoverable"/"persistent" (WCAG 1.4.13) come from Reka's
          DismissableLayer together with the mouseover/focusin handlers below.
      -->
      <PopoverContent
        :side="props.side"
        class="group w-full h-full max-w-xs lg:max-w-120 max-h-64 lg:max-h-80 rounded-md overflow-hidden flex border-[1px] shadow-3xl shadow-blue-950/15 dark:after:shadow-blue-100/20 dark:ring-8 dark:ring-black/65 bg-white dark:bg-black border-gray-400 data-[side=bottom]:animate-slideUpAndFade data-[side=right]:animate-slideLeftAndFade data-[side=left]:animate-slideRightAndFade data-[side=top]:animate-slideDownAndFade data-[state=open]:transition-all"
        @open-auto-focus="preventFocusSteal"
        @close-auto-focus="onCloseAutoFocus"
        @mouseover="stopClosingPopover"
        @focusin="stopClosingPopover">
        <!--
          Focus-guard sentinels: invisible, focusable boundary markers. Tabbing past
          the last real element lands on the trailing guard; Shift+Tab before the
          first lands on the leading guard. This makes the Tab "tether" robust no
          matter how many links the card has or how they nest (cover link, linkified
          title, abstract links) — see onLeadingGuardFocus / onTrailingGuardFocus.
        -->
        <span tabindex="0" data-focus-guard class="sr-only" @focus="onLeadingGuardFocus"></span>
        <RFCRouterLinkPreview v-if="rfc" :rfc="rfc" />
        <RFCRouterLinkLoadingStatus v-else :loading-status="loadingStatus" />
        <HoverCardArrow
          class="fill-white dark:fill-black stroke-gray-500 dark:stroke-gray-300 group-data-[side=bottom]:-mt-[1px] group-data-[side=top]:-mb-[1px] group-data-[side=left]:-ml-[1px] group-data-[side=right]:-mr-[1px]" />
        <span tabindex="0" data-focus-guard class="sr-only" @focus="onTrailingGuardFocus"></span>
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>

  <span v-if="hasTouchStore.hasTouch === true" class="inline">
    <DialogRoot v-model:open="isDialogOpen">
      <DialogTrigger class="ml-1 px-1 align-baseline hide-in-preformatted-text" @focus="loadRfc" @mouseover="loadRfc">
        <Icon name="fluent:preview-link-16-regular" aria-label="Link Preview" />
      </DialogTrigger>
      <DialogPortal>
        <DialogOverlay class="bg-black/10 data-[state=open]:animate-overlayShow fixed inset-0 z-30" />
        <DialogContent
          class="data-[state=open]:animate-enterFromBottom rounded-t-xl data-[state=closed]:animate-exitToBottom fixed w-full max-w-lg m-x-auto h-[50vh] bottom-0 right-0 shadow-[0_-5px_25px_rgba(0,0,0,0.25)] dark:shadow-[-5px_-5px_25px_rgba(11,140,197,0.25)] text-black bg-white dark:bg-black dark:text-white border-t-1 border-gray-400 dark:border-gray-400 overflow-y-scroll z-100">
          <DialogTitle class="sr-only" v-if="rfc"> RFC {{ rfc.number }} Preview</DialogTitle>
          <DialogClose class="fixed z-3 right-0 py-3 px-4 pb-3">
            <GraphicsClose />
          </DialogClose>
          <DialogDescription class="mx-auto pt-6 px-0">
            <RFCRouterLinkPreview v-if="rfc" :rfc="rfc" />
            <RFCRouterLinkLoadingStatus v-else :loading-status="loadingStatus" />
          </DialogDescription>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>
  </span>
</template>

<script setup lang="ts">
import { PopoverContent, PopoverPortal, PopoverRoot, PopoverTrigger } from 'reka-ui'
import { onUnmounted, customRef } from 'vue'
import RFCRouterLinkPreview from './RFCRouterLinkPreview.vue'
import { NuxtLink } from '#components'
import { RFC_TYPE_RFC } from '~/utilities/rfc'
import { parseMaybeRfcLink, rfcCommonPathBuilder, isOutsideNuxtLink } from '~/utilities/url'
import type { LoadingStatus } from '~/utilities/loading-status'
import type { VueStyleClass } from '~/utilities/vue'
import { RfcCommonSchema, type RfcCommon } from '~/utilities/rfc-validators'

type Props = {
  href: string
  id?: string
  class?: VueStyleClass
  side?: 'left' | 'bottom'
}

const props = withDefaults(defineProps<Props>(), { side: 'bottom' })

const hasTouchStore = useHasTouchStore()
const rfc = ref<RfcCommon | undefined>()
const isDialogOpen = ref<boolean>(false)
const isPopoverOpen = (() => {
  let value: boolean = false
  return customRef<boolean>((track, trigger) => ({
    get() {
      track()
      // we never want to open the hovercard while the dialog is open, or if there was an error loading the data
      return isDialogOpen.value || loadingStatus.value.type !== 'success' ? false : value
    },
    set(newValue) {
      value = Boolean(newValue)
      trigger()
    }
  }))
})()

const rfcId = parseMaybeRfcLink(props.href)

const hasUnmountedAbortController = new AbortController()

const loadingStatus = ref<LoadingStatus>({ type: 'idle' })

onUnmounted(() => {
  hasUnmountedAbortController?.abort()
})

/**
 * Loads RFC Common for the link preview
 */
const loadRfc = async (): Promise<void> => {
  // This is intentionally client-side only. There should be no SSR calling this function.
  // TODO: deduplicate requests for same RFC across components? Not sure if the added
  // complexity is worth it. Currently we're relying on browser network cache which seems fine.
  if (hasUnmountedAbortController.signal.aborted) {
    // The component has already unmounted so we can ignore requests to load this RFC
    return
  }
  if (rfc.value) {
    // Data already loaded so we can ignore requests to load it again
    return
  }
  if (loadingStatus.value.type === 'loading') {
    // A request is currently inflight so we don't need to try again. This is expected behaviour because the
    // mouseover and focus events could be fired multiple times before a request completes
    return
  }

  if (rfcId === undefined || rfcId.type !== RFC_TYPE_RFC) {
    console.warn(
      `Received "${props.href}" which wasn't parsed as having an rfc id (was: ${JSON.stringify(rfcId)}). Ignoring element ${JSON.stringify(props)}`
    )
    return
  }

  const rfcPath = rfcCommonPathBuilder(`rfc${rfcId.number}`)

  loadingStatus.value = {
    type: 'loading'
  }
  console.log(`Loading ${rfcPath}`)

  try {
    const response = await fetch(rfcPath, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'same-origin'
    })
    const rfcUnverified = await response.json()
    const rfcValidated = RfcCommonSchema.parse(rfcUnverified)
    loadingStatus.value = {
      type: 'success'
    }
    rfc.value = rfcValidated
    console.log(`Loaded ${rfcPath}`)
  } catch (e) {
    console.error(e)
    // hide the hover card if we can't load any content
    loadingStatus.value = {
      type: 'error',
      message: (e || '').toString()
    }
    return
  }
}

let openTimer: ReturnType<typeof setTimeout> | undefined = undefined

const DELAY_POPOVER_MS = 1000 // Wikipedia delay is 650ms. We're choosing more.

const startPopoverOpen = () => {
  clearTimeout(openTimer)
  openTimer = setTimeout(() => {
    isPopoverOpen.value = true
  }, DELAY_POPOVER_MS)
}

// small grace period so the pointer (or returning focus) can travel from the
// link into the popover before it closes — WCAG 1.4.13 "hoverable"/"persistent"
const CLOSE_LAG_MS = 500

const startPopoverClose = () => {
  clearTimeout(openTimer)

  openTimer = setTimeout(() => {
    isPopoverOpen.value = false
  }, CLOSE_LAG_MS)
}

/**
 * Cancels a pending close so the card stays open while the pointer or keyboard
 * focus is inside it.
 */
const stopClosingPopover = () => {
  clearTimeout(openTimer)
}

/**
 * Accessibility: break the open → exit and restore focus → automatically trigger re-open focus loop.
 *
 * Leaving the card returns focus to the originating link — via Shift+Tab, or via
 * Reka restoring focus to the trigger when the card closes (Escape, or tabbing
 * past the end). That focus would otherwise hit the link's `onFocus` and re-arm
 * the open timer, so the card the user just dismissed pops straight back and they
 * can never get out.
 *
 * This flag tells `onFocus` to skip the re-open for the single
 * synchronous focus event caused by such a return; a microtask clears it so a
 * later, genuine focus (tabbing *to* the link) still opens the card as normal.
 */
let isReturningFocusToTrigger = false

const suppressFocusOpenOnce = () => {
  isReturningFocusToTrigger = true
  queueMicrotask(() => {
    isReturningFocusToTrigger = false
  })
}

/**
 * When Reka returns focus to the link on
 * close, suppress the re-open (see `suppressFocusOpenOnce`). We don't cancel the
 * event — returning focus to the link is the correct, WCAG-friendly behaviour; we
 * only stop it from re-triggering the popover.
 */
const onCloseAutoFocus = () => {
  suppressFocusOpenOnce()
}

/**
 * Accessibility: keep keyboard focus on the link when the card opens.
 *
 * Reka's FocusScope autofocuses the popover's contents on mount unless the
 * `openAutoFocus` event is cancelled. Like Wikipedia's page previews, this card is
 * non-modal: opening it on focus must not move focus off the article link (that
 * would be a focus "steal" and would trap the user). We cancel the default so focus
 * stays put; the user opts into the card themselves by pressing Tab (see
 * `onTriggerKeydown`).
 */
const preventFocusSteal = (event: Event) => {
  event.preventDefault()
}

/** Elements that can hold keyboard focus, used to wire up the Tab tether below. */
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(',')

const getFocusable = (container: HTMLElement): HTMLElement[] =>
  Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) => !element.hasAttribute('data-focus-guard') && element.getClientRects().length > 0
  )

/**
 * Moves focus to the first focusable element that follows the trigger in document
 * order, skipping the popover's own (portalled) contents. Used for the forward
 * "exit" of the Tab tether so keyboard users continue through the page naturally
 * instead of looping back onto the link (which would re-open the card).
 */
const focusNextAfterTrigger = (trigger: HTMLElement, content: HTMLElement) => {
  const focusable = Array.from(document.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) => !content.contains(element) && (element === trigger || element.getClientRects().length > 0)
  )
  const index = focusable.indexOf(trigger)
  if (index !== -1) {
    focusable[index + 1]?.focus()
  }
}

/**
 * Accessibility: the Tab "tether" — entering the card.
 *
 * The card is rendered through `PopoverPortal`, so in the DOM it lives at the end
 * of <body> rather than next to the link. Native popovers splice their contents
 * into the tab sequence right after the trigger; a portalled Reka popover does
 * not, so a plain Tab from the link would skip straight to the next article link
 * and the card's interactive content (RFC heading link, abstract links) would be
 * unreachable by keyboard. While the card is open we redirect a forward Tab to the
 * first focusable element inside it. Reka surfaces the content element's id via the
 * trigger's `aria-controls`, so we resolve it without holding a separate ref.
 */
const onTriggerKeydown = (event: KeyboardEvent) => {
  if (event.key !== 'Tab' || event.shiftKey || !isPopoverOpen.value) {
    return
  }
  const trigger = event.currentTarget
  if (!(trigger instanceof HTMLElement)) {
    return
  }
  const contentId = trigger.getAttribute('aria-controls')
  const content = contentId ? document.getElementById(contentId) : null
  if (!content) {
    return
  }
  const [firstFocusable] = getFocusable(content)
  if (!firstFocusable) {
    // Nothing interactive to enter yet (e.g. still loading) — let Tab behave normally.
    return
  }
  event.preventDefault()
  stopClosingPopover()
  firstFocusable.focus()
}

/**
 * Resolves the trigger link for the open card. Reka labels the content
 * (role="dialog") with the trigger's id via `aria-labelledby`, so we can walk from
 * any element inside the card back to its link without holding a separate ref.
 */
const resolveTrigger = (withinContent: HTMLElement): HTMLElement | null => {
  const content = withinContent.closest<HTMLElement>('[role="dialog"]')
  const triggerId = content?.getAttribute('aria-labelledby')
  return triggerId ? document.getElementById(triggerId) : null
}

/**
 * Accessibility: the Tab "tether" — leaving the card (leading edge).
 *
 * Shift+Tab from the first real element in the card lands on the leading guard
 * sentinel. We hand focus back to the link (without re-opening the card — see
 * `suppressFocusOpenOnce`). Using a sentinel rather than computing "the first
 * focusable" keeps this correct no matter how the card's links nest (cover link,
 * linkified title, abstract links).
 */
const onLeadingGuardFocus = (event: FocusEvent) => {
  const guard = event.currentTarget
  if (!(guard instanceof HTMLElement)) {
    return
  }
  stopClosingPopover()
  suppressFocusOpenOnce()
  resolveTrigger(guard)?.focus()
}

/**
 * Accessibility: the Tab "tether" — leaving the card (trailing edge).
 *
 * Tab past the last real element in the card lands on the trailing guard sentinel.
 * We continue to the link that follows the trigger in the document (not back onto
 * the trigger, which would re-open the card and trap the user) and close the card.
 */
const onTrailingGuardFocus = (event: FocusEvent) => {
  const guard = event.currentTarget
  if (!(guard instanceof HTMLElement)) {
    return
  }
  const content = guard.closest<HTMLElement>('[role="dialog"]')
  const trigger = resolveTrigger(guard)
  suppressFocusOpenOnce()
  if (trigger && content) {
    focusNextAfterTrigger(trigger, content)
  }
  isPopoverOpen.value = false
}

/**
 * Events spread onto every link variant. They drive the Wikipedia-style open/close
 * behaviour — open on hover or focus after a delay, without stealing focus — and
 * kick off the RFC data fetch.
 */
const popoverAttributes = {
  class: props.class,
  onMouseover: loadRfc,
  onBlur: startPopoverClose,
  onFocus: () => {
    loadRfc()
    if (isReturningFocusToTrigger) {
      // Focus is bouncing back from the card (exit / dismiss) — don't re-open it.
      return
    }
    startPopoverOpen()
  },
  onMouseenter: startPopoverOpen,
  onMouseleave: startPopoverClose,
  onKeydown: onTriggerKeydown
}

defineOptions({
  inheritAttrs: false
})
</script>
