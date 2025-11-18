<template>
  <div
    :class="[
      'relative after:content-[\'_\'] after:absolute after:left-0 after:top-0 after:w-full after:h-full after:pointer-events-none after:transition-shadow after:duration-800',
      canScrollLeft && !canScrollRight && 'after:shadow-[inset_20px_0px_20px_-20px_rgba(0,_45,_60,_0.5),inset_20px_0px_20px_-20px_rgba(0,_45,_60,_0.5)] dark:shadow-[inset_20px_0px_20px_-20px_rgba(140,_201,_222,_0.5),inset_20px_0px_20px_-20px_rgba(140,_201,_222,_0.5)]',
      !canScrollLeft && canScrollRight && 'after:w-[100px] after:shadow-[inset_-20px_0px_20px_-20px_rgba(0,_45,_60,_0.5),inset_-20px_0px_20px_-20px_rgba(0,_45,_60,_0.5)] dark:shadow-[inset_-20px_0px_20px_-20px_rgba(140,_201,_222,_0.5),inset_-20px_0px_20px_-20px_rgba(140,_201,_222,_0.5)]',
      canScrollLeft && canScrollRight && 'after:shadow-[inset_20px_0px_20px_-20px_rgba(0,_45,_60,_0.5),inset_-20px_0px_20px_-20px_rgba(0,_45,_60,_0.5)] dark:shadow-[inset_20px_0px_20px_-20px_rgba(140,_201,_222,_0.5),inset_-20px_0px_20px_-20px_rgba(140,_201,_222,_0.5)]',
      props.class
    ]"
  >
    <component
      :is="props.as"
      ref="scroll-container"
      :class="['relative w-full max-w-[calc(100vw_-_var(--rfc-editor-org-scrollbar-width,16px))] overflow-x-auto', props.innerClass]"
      @scroll="debouncedUpdateScrollHint"
    >
      <slot />
    </component>
  </div>
</template>

<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core'
import type { VueStyleClass } from '~/utilities/vue'

type Props = {
  /** Optional element nodeName (default 'div') */
  as?: string
  class?: VueStyleClass
  innerClass?: VueStyleClass
}

const props = withDefaults(defineProps<Props>(), { 'as': 'div' })

const scrollContainer = useTemplateRef('scroll-container')
const canScrollLeft = ref(false)
const canScrollRight = ref(false)

const BUFFER_PX = 8

const setTimeoutTimers: ReturnType<typeof setTimeout>[] = []

const updateScrollHint = () => {
  const { value: scrollContainerElement } = scrollContainer
  if (!scrollContainerElement) {
    console.error('Unable to find scroll container. This is a bug')
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

onMounted(() => {
  window.addEventListener('resize', debouncedUpdateScrollHint)
  // On the search page the layout takes a long time to settle, so we need to recalculate
  // scroll hints frequently during the initial page load which could take 10s of seconds.

  // The goal is to recalculate occasionally for the first ~20 seconds.

  // While a setInterval might be fewer lines of code it wouldn't be as simple and as easy
  // to debug imo
  setTimeoutTimers.push(setTimeout(debouncedUpdateScrollHint, 50))
  setTimeoutTimers.push(setTimeout(debouncedUpdateScrollHint, 500))
  setTimeoutTimers.push(setTimeout(debouncedUpdateScrollHint, 2000))
  setTimeoutTimers.push(setTimeout(debouncedUpdateScrollHint, 4000))
  setTimeoutTimers.push(setTimeout(debouncedUpdateScrollHint, 6000))
  setTimeoutTimers.push(setTimeout(debouncedUpdateScrollHint, 10000))
  setTimeoutTimers.push(setTimeout(debouncedUpdateScrollHint, 15000))
  setTimeoutTimers.push(setTimeout(debouncedUpdateScrollHint, 20000))
})

onUnmounted(() => {
  window.removeEventListener('resize', debouncedUpdateScrollHint)
  while (setTimeoutTimers.length > 0) {
    clearTimeout(setTimeoutTimers.pop())
  }
})
</script>