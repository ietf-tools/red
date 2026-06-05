<template>
  <HoverCardRoot v-model:open="isHoverCardOpen">
    <HoverCardTrigger as-child>
      <a
        v-if="props.href?.startsWith('#')"
        :href="props.href"
        :id="props.id"
        data-is-hash-link
        :class="props.class"
        @focus="loadRfc"
        @mouseover="loadRfc"
        @blur="isHoverCardOpen = false">
        <slot />
      </a>
      <a
        v-else-if="isOutsideNuxtLink(props.href)"
        :href="props.href"
        data-is-outside-nuxt
        :class="props.class"
        @focus="loadRfc"
        @mouseover="loadRfc"
        @blur="isHoverCardOpen = false">
        <slot />
      </a>
      <NuxtLink
        v-else
        :id="props.id"
        :to="props.href"
        data-is-nuxt-link
        :class="props.class"
        @focus="loadRfc"
        @mouseover="loadRfc"
        @blur="isHoverCardOpen = false">
        <slot />
      </NuxtLink>
    </HoverCardTrigger>
    <HoverCardPortal>
      <HoverCardContent
        :side="props.side"
        class="w-full h-full max-w-xs lg:max-w-120 max-h-64 lg:max-h-80 rounded-md overflow-hidden flex border-[1px] shadow-3xl shadow-blue-950/15 dark:after:shadow-blue-100/20 dark:ring-8 dark:ring-black/65 bg-white dark:bg-black border-gray-400 data-[side=bottom]:animate-slideUpAndFade data-[side=right]:animate-slideLeftAndFade data-[side=left]:animate-slideRightAndFade data-[side=top]:animate-slideDownAndFade data-[state=open]:transition-all">
        <RFCRouterLinkPreview v-if="rfc" :rfc="rfc" />
        <RFCRouterLinkLoadingStatus v-else :loading-status="loadingStatus" />
        <HoverCardArrow class="fill-white dark:fill-black stroke-gray-500 dark:stroke-gray-300 -mt-[1px]" />
      </HoverCardContent>
    </HoverCardPortal>
  </HoverCardRoot>

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
const isHoverCardOpen = (() => {
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

defineOptions({
  inheritAttrs: false
})
</script>
