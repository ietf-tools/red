<template>
  <DialogRoot v-model:open="isOpen">
    <DialogPortal>
      <DialogOverlay class="bg-blue-900/50 fixed inset-0 z-110 overflow-y-scroll py-16">
        <DialogContent
          class="mx-auto w-[90vw] max-w-[600px] relative rounded-md bg-white dark:bg-blue-900 px-5 pt-3 pb-5 z-[100]">
          <DialogTitle as="h1" class="text-xl font-bold py-2 pr-20">Reading aloud needs a speech voice</DialogTitle>
          <DialogDescription class="pb-3 text-balance">
            Your browser tried to read this RFC aloud and could not. It reports no speech voices, which come from your
            operating system rather than from this website.
          </DialogDescription>

          <Heading level="2" style-level="4" class="mt-2 mb-2">{{ advice.heading }}</Heading>
          <p>{{ advice.summary }}</p>
          <ul v-if="advice.links.length > 0" class="mt-2 flex flex-col gap-1">
            <li v-for="link in advice.links" :key="link.href">
              <Anchor :href="link.href" class="underline">
                {{ link.label }}
                <GraphicsNewWindowIcon class="text-xl -mt-2 align-middle" />
              </Anchor>
            </li>
          </ul>

          <p class="pt-4 text-sm text-gray-800 dark:text-gray-200">
            Once a voice is installed, the Read aloud button will work. You can choose a voice and a speech rate in the
            advanced settings.
          </p>

          <DialogClose
            class="absolute border-1 border-gray-400 top-4 right-5 rounded cursor-pointer px-3 py-1 focus:bg-gray-500/25 hover:bg-gray-500/25">
            Close
          </DialogClose>
        </DialogContent>
      </DialogOverlay>
    </DialogPortal>
  </DialogRoot>
</template>

<script setup lang="ts">
import { detectPlatform, NO_VOICES_ADVICE, type Platform } from '~/utilities/reading-mode/no-voices-advice'

const isOpen = defineModel<boolean>('open', { required: true })

const platform = ref<Platform>('other')

onMounted(() => {
  platform.value = detectPlatform(navigator.userAgent)
})

const advice = computed(() => NO_VOICES_ADVICE[platform.value])
</script>
