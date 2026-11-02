<template>
  <Transition
    enter-active-class="motion-safe:transition motion-safe:duration-300 motion-safe:ease-out"
    leave-active-class="motion-safe:transition motion-safe:duration-200 motion-safe:ease-in"
    enter-from-class="opacity-0 motion-safe:-translate-y-4"
    leave-to-class="opacity-0 motion-safe:-translate-y-4">
    <div
      v-if="props.isOpen"
      role="region"
      aria-label="Read aloud controls"
      data-reading-mode-player
      @keydown.esc="emit('close')"
      :class="[
        'fixed top-2 inset-x-0 mx-auto w-fit max-w-[calc(100vw-1rem)] z-50 print:hidden',
        'flex items-center gap-1 p-1',
        'rounded-lg border-1 border-blue-950 dark:border-blue-25 shadow-lg',
        'bg-white dark:bg-blue-900 text-blue-900 dark:text-blue-100'
      ]">
      <button type="button" :class="buttonClasses" data-reading-previous @click="emit('skip', -1)">
        <GraphicsSkipPrevious class="text-2xl" />
        <span class="sr-only">Previous paragraph</span>
      </button>
      <button
        type="button"
        :class="buttonClasses"
        data-reading-play-pause
        :data-reading-status="props.status"
        @click="emit('toggle')">
        <GraphicsPause v-if="props.status === 'playing'" class="text-2xl" />
        <GraphicsPlay v-else class="text-2xl" />
        <span class="sr-only">{{ props.status === 'playing' ? 'Pause reading' : 'Resume reading' }}</span>
      </button>
      <button type="button" :class="buttonClasses" data-reading-next @click="emit('skip', 1)">
        <GraphicsSkipNext class="text-2xl" />
        <span class="sr-only">Next paragraph</span>
      </button>
      <button
        type="button"
        :class="[buttonClasses, 'ml-3']"
        aria-label="Close read aloud controls"
        data-reading-close
        @click="emit('close')">
        <GraphicsDismiss class="text-xl" />
      </button>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import type { ReadingStatus } from '~/utilities/reading-mode/controller'

type Props = {
  isOpen: boolean
  status: ReadingStatus
}

const props = defineProps<Props>()

const emit = defineEmits<{ toggle: []; skip: [direction: 1 | -1]; close: [] }>()

const buttonClasses = [
  'flex items-center justify-center min-w-10 min-h-10 rounded cursor-pointer',
  'hover:bg-sky-100 focus:bg-blue-25 dark:hover:bg-black dark:focus:bg-black',
  'border-2 border-transparent hover:border-blue-800 focus:border-blue-800 dark:hover:border-blue-25 dark:focus:border-blue-25 outline-0'
]
</script>
