<template>
  <component
    :is="props.as"
    ref="scroll-container"
    :class="[
      'w-full max-w-[calc(100vw_-_var(--scrollbar-width))] overflow-x-auto transition-shadow duration-800',
      props.class,
      {
        'shadow-[inset_70px_0px_90px_-70px_rgba(0,_45,_60,_0.5),inset_36px_0px_20px_-36px_rgba(0,_45,_60,_0.5)] dark:shadow-[inset_70px_0px_90px_-70px_rgba(140,_201,_222,_0.5),inset_36px_0px_20px_-36px_rgba(140,_201,_222,_0.5)]':
          canScrollLeft && !canScrollRight,
        'shadow-[inset_-70px_0px_90px_-70px_rgba(0,_45,_60,_0.5),inset_-36px_0px_20px_-36px_rgba(0,_45,_60,_0.5)] dark:shadow-[inset_-70px_0px_90px_-70px_rgba(140,_201,_222,_0.5),inset_-36px_0px_20px_-36px_rgba(140,_201,_222,_0.5)]':
          !canScrollLeft && canScrollRight,
        'shadow-[inset_70px_0px_90px_-70px_rgba(0,_45,_60,_0.5),inset_-70px_0px_90px_-70px_rgba(0,_45,_60,_0.5)] dark:shadow-[inset_70px_0px_90px_-70px_rgba(140,_201,_222,_0.5),inset_-70px_0px_90px_-70px_rgba(140,_201,_222,_0.5)]':
          canScrollLeft && canScrollRight
      }]"
    @scroll="debouncedUpdateScrollHint"
  >
    <slot />
  </component>
</template>

<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core'
import type { VueStyleClass } from '~/utilities/vue'

type Props = {
  /** Optional element nodeName (default 'div') */
  as?: string
  class?: VueStyleClass
}

const props = withDefaults(defineProps<Props>(), { 'as': 'div' })

const scrollContainer = useTemplateRef('scroll-container')
const canScrollLeft = ref(false)
const canScrollRight = ref(false)

const BUFFER_PX = 8

let timer: ReturnType<typeof setTimeout>

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
  timer = setTimeout(updateScrollHint, 50)
})

onUnmounted(() => {
  window.removeEventListener('resize', debouncedUpdateScrollHint)
  if (timer) {
    clearTimeout(timer)
  }
})
</script>