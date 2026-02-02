<template>
  <div
    ref="scroll-container"
    :class="[
      'overflow-y-auto transition-shadow duration-400',
      canScrollUp && !canScrollDown && 'shadow-[inset_0px_20px_20px_-20px_rgba(0,_45,_60,_0.5),inset_0px_20px_20px_-20px_rgba(0,_45,_60,_0.5)] dark:shadow-[inset_0px_20px_20px_-20px_rgba(140,_201,_222,_0.5),inset_0px_20px_20px_-20px_rgba(140,_201,_222,_0.5)]',
      !canScrollUp && canScrollDown && 'shadow-[inset_0px_-20px_20px_-20px_rgba(0,_45,_60,_0.5),inset_0px_-20px_20px_-20px_rgba(0,_45,_60,_0.5)] dark:shadow-[inset_0px_-20px_20px_-20px_rgba(140,_201,_222,_0.5),inset_0px_-20px_20px_-20px_rgba(140,_201,_222,_0.5)]',
      canScrollUp && canScrollDown && 'shadow-[inset_0px_20px_20px_-20px_rgba(0,_45,_60,_0.5),inset_0px_-20px_20px_-20px_rgba(0,_45,_60,_0.5)] dark:shadow-[inset_0px_20px_90px_-70px_rgba(140,_201,_222,_0.5),inset_0px_-70px_90px_-70px_rgba(140,_201,_222,_0.5)]',
      props.class
    ]"
    @scroll="debouncedUpdateScrollHint"
  >
    <slot />
  </div>
</template>

<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core'

const scrollContainer = useTemplateRef('scroll-container')
const canScrollUp = ref(false)
const canScrollDown = ref(false)

type Props = {
  class: string
}

const props = defineProps<Props>()

const BUFFER_PX = 8

const updateScrollHint = () => {
  const { value: scrollContainerElement } = scrollContainer
  if (!scrollContainerElement) {
    console.error('Unable to find scroll container. This is a bug')
    return
  }
  if (!(scrollContainerElement instanceof HTMLElement)) {
    throw Error("Scroll container isn't HTML Element. This is a bug.")
  }
  canScrollUp.value = scrollContainerElement.scrollTop > BUFFER_PX
  canScrollDown.value =
    scrollContainerElement.scrollTop + scrollContainerElement.offsetHeight <
    scrollContainerElement.scrollHeight - BUFFER_PX
}

const debouncedUpdateScrollHint = useDebounceFn(updateScrollHint, 100)

const observerRef = ref<ResizeObserver | null>(null)

let timer: ReturnType<typeof setTimeout>

onMounted(() => {
  window.addEventListener('resize', debouncedUpdateScrollHint)
  debouncedUpdateScrollHint()
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

  timer = setTimeout(updateScrollHint, 50)
})

onUnmounted(() => {
  window.removeEventListener('resize', debouncedUpdateScrollHint)
  observerRef.value?.disconnect()
  if (timer) {
    clearTimeout(timer)
  }
})

defineExpose({
  scrollContainer,
})
</script>
