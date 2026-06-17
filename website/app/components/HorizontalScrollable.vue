<template>
  <div
    :class="[
      'horizontal-scrollable relative after:content-[\'_\'] after:absolute after:left-0 after:top-0 after:z-2 after:w-full after:h-full after:pointer-events-none after:transition-shadow after:duration-800',
      canScrollLeft &&
        !canScrollRight &&
        'after:shadow-[inset_20px_0px_20px_-20px_rgba(0,_45,_60,_0.5),inset_20px_0px_20px_-20px_rgba(0,_45,_60,_0.5)] dark:after:shadow-[inset_20px_0px_20px_-20px_rgba(140,_201,_222,_1),inset_20px_0px_20px_-20px_rgba(140,_201,_222,_1)]',
      !canScrollLeft &&
        canScrollRight &&
        'after:w-[100px] after:shadow-[inset_-20px_0px_20px_-20px_rgba(0,_45,_60,_0.5),inset_-20px_0px_20px_-20px_rgba(0,_45,_60,_0.5)] dark:after:shadow-[inset_-20px_0px_20px_-20px_rgba(140,_201,_222,_1),inset_-20px_0px_20px_-20px_rgba(140,_201,_222,_1)]',
      canScrollLeft &&
        canScrollRight &&
        'after:shadow-[inset_20px_0px_20px_-20px_rgba(0,_45,_60,_0.5),inset_-20px_0px_20px_-20px_rgba(0,_45,_60,_0.5)] dark:after:shadow-[inset_20px_0px_20px_-20px_rgba(200,_201,_222,_1),inset_-20px_0px_20px_-20px_rgba(200,_201,_222,_1)]',
      props.class
    ]">
    <ButtonSuccessFailure v-if="showCopyButton" :click-handler="handleCopyPre">
      <Icon
        name="fluent:copy-16-regular"
        size="1.6em"
        alt="Copy to clipboard"
        class="text-black dark:text-white bg-transparent" />
    </ButtonSuccessFailure>
    <component
      :is="props.as"
      ref="scroll-container"
      :class="[
        'w-full max-w-screen overflow-hidden overflow-x-auto',
        {
          ['bg-gray-100 dark:bg-gray-950 border-r-[40px] border-gray-100 dark:border-gray-950 ']: props.containsPre
        },
        props.innerClass
      ]"
      @scroll="debouncedUpdateScrollHint">
      <slot />
    </component>
  </div>
</template>

<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core'
import { BUBBLE_DURATION_MS, type ButtonResult, type Message } from '~/utilities/buttonSuccessFailure'
import { copyToClipboard } from '~/utilities/clipboard'
import { getRfc8792CopyText } from '~/utilities/rfc8792'
import type { VueStyleClass } from '~/utilities/vue'

type Props = {
  /** Optional element nodeName (default `div`) */
  as?: string
  class?: VueStyleClass
  innerClass?: VueStyleClass
  containsPre?: boolean
}

const props = withDefaults(defineProps<Props>(), { as: 'div' })

const scrollContainer = useTemplateRef<HTMLElement>('scroll-container')
const canScrollLeft = ref(false)
const canScrollRight = ref(false)

const BUFFER_PX = 8

const showCopyButton = computed(() => props.containsPre && hasMounted.value)

const setTimeoutTimers: ReturnType<typeof setTimeout>[] = []

const updateScrollHint = () => {
  const { value: scrollContainerElement } = scrollContainer
  if (!scrollContainerElement) {
    return
  }
  if (!(scrollContainerElement instanceof HTMLElement)) {
    throw Error("Scroll container isn't HTML Element. This is a bug.")
  }
  canScrollLeft.value = scrollContainerElement.scrollLeft > BUFFER_PX
  canScrollRight.value =
    scrollContainerElement.scrollLeft + scrollContainerElement.offsetWidth <
    scrollContainerElement.scrollWidth - BUFFER_PX
}

const debouncedUpdateScrollHint = useDebounceFn(updateScrollHint, 100)

const observerRef = ref<ResizeObserver | null>(null)

/**
 * Feature primarily developed by [Filip Skokan (Panva)](https://github.com/panva) see [PR](https://github.com/ietf-tools/red/pull/404).
 *
 * When the `<pre>` text is unfolded the success message says that text was modified from the raw `<pre>` innerText.
 *
 * It is intentional not to have multiple buttons to copy different variations of text.
 * Instead, users wanting the wrapped text must select the `<pre>` text like any other webpage text.
 *
 * See discussion on https://github.com/ietf-tools/red/pull/404
 */
const handleCopyPre = async (): Promise<ButtonResult> => {
  if (!props.containsPre) {
    throw Error('Internal error: should not be able to copy unless containsPre is true.')
  }
  const { value: scrollContainerElement } = scrollContainer
  if (!scrollContainerElement) {
    throw Error('Internal error: expected scroll container to be available.')
  }
  const preElement = scrollContainerElement.querySelector('pre')
  if (!preElement) {
    console.error({ scrollContainerElement })
    throw Error('Internal error: expected to find <pre> inside scrollable container.')
  }
  let txt = preElement.innerText
  if (txt) {
    const unfoldedTxt = getRfc8792CopyText(txt)
    txt = unfoldedTxt ?? txt
    const unfoldedMessage: Message[] =
      unfoldedTxt !== null ? [{ type: 'medium', innerText: '(text unfolded per RFC 8792)' }] : []

    if (await copyToClipboard(txt)) {
      return {
        type: 'success',
        message: [{ type: 'big', innerText: 'Text copied' }, ...unfoldedMessage],
        timeoutMs: BUBBLE_DURATION_MS
      }
    }
  }

  return {
    type: 'error',
    message: [{ type: 'big', innerText: 'Copy error.' }],
    timeoutMs: BUBBLE_DURATION_MS
  }
}

const hasMounted = ref(false)

onMounted(() => {
  hasMounted.value = true
  window.addEventListener('resize', debouncedUpdateScrollHint)
  if (!('ResizeObserver' in window)) {
    return
  }
  observerRef.value = new ResizeObserver(debouncedUpdateScrollHint)
  const { value: scrollContainerElement } = scrollContainer
  if (!scrollContainerElement) {
    console.error('Unable to find scroll container. This is a bug')
    return
  }
  observerRef.value?.observe(scrollContainerElement)
})

onUnmounted(() => {
  window.removeEventListener('resize', debouncedUpdateScrollHint)
  observerRef.value?.disconnect()
  while (setTimeoutTimers.length > 0) {
    clearTimeout(setTimeoutTimers.pop())
  }
})
</script>
