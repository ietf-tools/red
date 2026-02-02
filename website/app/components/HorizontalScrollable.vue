<template>
  <div :class="[
    'horizontal-scrollable-container relative after:content-[\'_\'] after:absolute after:left-0 after:top-0 after:w-full after:h-full after:pointer-events-none after:transition-shadow after:duration-800',
    canScrollLeft && !canScrollRight && 'after:shadow-[inset_20px_0px_20px_-20px_rgba(0,_45,_60,_0.5),inset_20px_0px_20px_-20px_rgba(0,_45,_60,_0.5)] dark:shadow-[inset_20px_0px_20px_-20px_rgba(140,_201,_222,_0.5),inset_20px_0px_20px_-20px_rgba(140,_201,_222,_0.5)]',
    !canScrollLeft && canScrollRight && 'after:w-[100px] after:shadow-[inset_-20px_0px_20px_-20px_rgba(0,_45,_60,_0.5),inset_-20px_0px_20px_-20px_rgba(0,_45,_60,_0.5)] dark:shadow-[inset_-20px_0px_20px_-20px_rgba(140,_201,_222,_0.5),inset_-20px_0px_20px_-20px_rgba(140,_201,_222,_0.5)]',
    canScrollLeft && canScrollRight && 'after:shadow-[inset_20px_0px_20px_-20px_rgba(0,_45,_60,_0.5),inset_-20px_0px_20px_-20px_rgba(0,_45,_60,_0.5)] dark:shadow-[inset_20px_0px_20px_-20px_rgba(140,_201,_222,_0.5),inset_-20px_0px_20px_-20px_rgba(140,_201,_222,_0.5)]',
    props.class
  ]">
    <component
      :is="props.as"
      ref="scroll-container"
      :class="['w-[100cqi] max-w-[calc(100vw_-_var(--rfc-editor-org-scrollbar-width))] overflow-x-auto', props.innerClass]"
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
  /** Optional element nodeName (default `div`) */
  as?: string
  class?: VueStyleClass
  innerClass?: VueStyleClass
}

const props = withDefaults(defineProps<Props>(), { 'as': 'div' })

const scrollContainer = useTemplateRef<HTMLElement>('scroll-container')
const canScrollLeft = ref(false)
const canScrollRight = ref(false)

const BUFFER_PX = 8

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

onMounted(() => {
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

<style>
.horizontal-scrollable-container {
  container-type: inline-size;
}
</style>