<template>
    <a
        :class="[
            {
                'opacity-0 pointer-events-none': !debouncedIsVisible,
                'opacity-100': debouncedIsVisible
            },
            'fixed top-1 right-2 lg:right-auto text-black font-bold rounded-b z-10 bg-white hover:text-white focus:text-white hover:bg-blue-300 dark:bg-black dark:hover:bg-blue-500 border border-gray-200 dark:border-gray-600 px-3 py-2 font-lg transition-opacity print:hidden shadow-lg shadow-gray-300 dark:shadow-blue-900 dark:text-white focus:opacity-100 focus:pointer-events-auto',
        ]"
        href="#top"
        title="Go to top of page"
    >
        <GraphicsExpandSidebar class="inline-block rotate-90" />
    </a>
</template>

<script setup lang="ts">
import { throttle } from 'lodash-es'
import { debouncedRef } from '@vueuse/core'

const isVisible = ref(false)
const debouncedIsVisible = debouncedRef(isVisible, 200)
const BEYOND_HEADER_PX = 250

const handleScroll = () => {
    isVisible.value = Boolean(window.scrollY > BEYOND_HEADER_PX)
}

const throttledHandleScroll = throttle(handleScroll, 100)

onMounted(() => {
    document.addEventListener('scroll', throttledHandleScroll, {
        passive: true
    })
    document.addEventListener('scrollsnapchanging', throttledHandleScroll, {
        passive: true
    })
    document.addEventListener('touchmove', throttledHandleScroll, {
        passive: true
    })
    throttledHandleScroll()
})

onUnmounted(() => {
    document.removeEventListener('scroll', throttledHandleScroll)
    document.removeEventListener('scrollsnapchanging', throttledHandleScroll)
    document.removeEventListener('touchmove', throttledHandleScroll)
})
</script>