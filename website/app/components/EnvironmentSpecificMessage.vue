<template>
    <DialogRoot v-model:open="isOpen" @close="isOpen = false">
        <DialogTrigger>
            <button
                class="button-shimmer button-highlight flex flex-row ml-2 sm:ml-4 gap-3 items-center cursor-pointer">
                <div class="button-shimmer-target px-3 py-0 sm:py-1 uppercase font-bold text-yellow-100 text-xs md:text-sm rounded-md border-3 border-double border-yellow-500 shadow-xl text-shadow-lg bg-radial from-yellow-600 to-yellow-700 tracking-wide"
                    style="corner-shape: scoop;">
                    beta
                </div>
                <div>
                    <div
                        class="button-highlight-target my-1 bg-gray-100 text-black rounded-sm px-1 py-1 sm:py-1 sm:px-2 text-xs font-bold text-gray-600 flex items-center gap-1">
                        <span class="hidden sm:inline"> beta feedback </span>
                        <Icon name="garden:speech-bubble-plain-fill-12" size="1em" />
                    </div>
                </div>
            </button>
        </DialogTrigger>
        <DialogPortal>
            <DialogOverlay class="bg-black/10 backdrop-blur-xs fixed inset-0 z-30" />
            <DialogContent class="fixed top-0 left-[50%] -ml-[10em] z-100">
                <div
                    class="relative bg-white max-w-[20em] mx-auto flex flex-col gap-3 pt-2 pb-3 px-4 rounded-xs shadow-2xl"
                >
                    <DialogClose class="absolute right-3 top-3 cursor-pointer">
                        <GraphicsClose />
                    </DialogClose>
                    <h1 class="text-lg font-bold">Beta feedback</h1>
                    <p class="m-0">
                        Please email your feedback to
                        <a :href="`mailto:${EMAIL}`"
                            class="underline whitespace-nowrap font-mono hover:bg-gray-100 focus:bg-gray-100">
                            {{ EMAIL }}
                        </a>
                    </p>
                    <div class="text-sm">
                        <p>If you're reporting a bug please share your browser/platform details:</p>
                        <div class="font-mono block bg-gray-100 text-xs p-2 border-1 border-gray-700 no-underline"
                            rows="4">
                            {{ userAgent }}
                        </div>
                        <button
                            v-if="!isCopied"
                            class="inline-block text-left border-1 border-gray-700 bg-black text-white border-gray-200 cursor-pointer px-2 py-1 text-sm hover:bg-gray-700 focus:bg-gray-700"
                            @click="handleClipboard"
                        >
                             click to copy
                        </button>
                        <span aria-atomic="true" aria-live="assertive"
                            :class="isCopied ? 'inline-block rounded-md font-bold p-2 bg-red-200 text-sm my-2' : undefined">
                            <template v-if="isCopied">
                                copied! <span class="font-normal ml-1">just paste into your email</span>
                            </template>
                        </span>
                    </div>
                </div>
            </DialogContent>
        </DialogPortal>
    </DialogRoot>
</template>

<script setup lang="ts">
import {
    DialogClose,
    DialogContent,
    DialogOverlay,
    DialogPortal,
    DialogRoot,
    DialogTrigger
} from 'reka-ui'
import { copyToClipboard } from '~/utilities/clipboard'

const EMAIL = 'rfc-editor@rfc-editor.org'

const isCopied = ref(false)
const userAgent = ref('')

onMounted(() => {
    isCopied.value = false
    userAgent.value = window.navigator.userAgent ?? 'could not detect user agent'
})

const isOpen = ref(false)

watch(isOpen, () => {
    isCopied.value = false
})

const handleClipboard = () => {
    copyToClipboard(userAgent.value)
    isCopied.value = true
}
</script>

<style scoped>
.button-shimmer:hover .button-shimmer-target,
.button-shimmer:focus .button-shimmer-target {
    background-size: 200% 100%;
    animation: shimmer-animation 3s infinite linear;
}

@keyframes shimmer-animation {
    0% {
        background-position: -200% 0;
    }

    100% {
        background-position: 200% 0;
    }
}

@media (prefers-reduced-motion: reduce) {

    .button-shimmer:hover .button-shimmer-target,
    .button-shimmer:focus .button-shimmer-target {
        animation: none
    }
}

.button-highlight:hover .button-highlight-target,
.button-highlight:focus .button-highlight-target {
    background: white
}
</style>