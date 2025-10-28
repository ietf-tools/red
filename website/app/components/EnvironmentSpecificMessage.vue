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
                    class="relative bg-white dark:bg-black text-black dark:text-white max-w-[20em] mx-auto flex flex-col gap-3 pt-2 pb-3 px-4 rounded-xs shadow-2xl">
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
                    <h2 class="text-lg font-bold">Known issues</h2>
                    <ul class="list-disc ml-5 text-sm">
                        <li>
                            Data is pulled from <a :href="DATATRACKER_URL_ORIGIN" class="underline">Datatracker</a> and
                            during IETF 124 this will be static and stale. This known issue will be fixed before a production release.
                        </li>
                        <li>Please feel free to ask if it's a known issue at the RFC Editor desk.</li>
                    </ul>
                    <div class="text-sm">
                        <p>If you're reporting a bug please share your browser/platform details, which are:</p>
                        <div class="font-mono block bg-gray-100 dark:bg-gray-800 text-xs dark:text-white p-2 border-1 border-gray-300 dark:border-gray-500  no-underline"
                            rows="4">
                            {{ browserPlatformDetails }}
                        </div>
                        <button v-if="!isCopied"
                            class="inline-block text-left border-1 border-gray-700 bg-black text-white border-gray-200 dark:border-gray-200 cursor-pointer px-2 py-1 mb-2 text-sm hover:bg-gray-700 focus:bg-gray-700"
                            @click="handleClipboard">
                            click to copy
                        </button>
                        <span aria-atomic="true" aria-live="assertive"
                            :class="isCopied ? 'block w-full border-1 border-green-300 font-bold px-2 py-1 bg-green-200 dark:bg-green-700 text-sm mb-2' : undefined">
                            <template v-if="isCopied">
                                copied! <span class="font-normal ml-1">please paste into your email</span>
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
import { DATATRACKER_URL_ORIGIN } from '~/utilities/url'

const EMAIL = 'rfc-editor@rfc-editor.org'

const isCopied = ref(false)
const browserPlatformDetails = ref('')

onMounted(() => {
    isCopied.value = false
    const userAgent = window.navigator.userAgent ?? '(could not detect user agent)'
    const browserDimensions = `Browser dimensions ${window.screen.width}×${window.screen.height}\n`
    browserPlatformDetails.value = [userAgent, browserDimensions].join("\n")
})

const isOpen = ref(false)

watch(isOpen, () => {
    isCopied.value = false
})

const handleClipboard = () => {
    copyToClipboard(browserPlatformDetails.value)
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