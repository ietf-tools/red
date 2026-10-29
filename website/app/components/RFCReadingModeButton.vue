<template>
  <button
    type="button"
    :class="[
      'flex flex-col sm:flex-row items-center',
      'pl-1 pr-2 py-1 gap-2',
      'cursor-pointer',
      'rounded',
      'text-sm text-center md:text-left',
      'font-bold',
      'after:transition-all',
      'text-blue-900 dark:text-blue-100 hover:text-blue-400 focus:text-blue-400 dark:hover:text-blue-25 dark:focus:text-blue-100 hover:bg-sky-100 focus:bg-blue-25 dark:hover:bg-blue-900 dark:focus:bg-blue-900',
      'border-1 border-white rounded hover:border-blue-800 hover:after:border-blue-25 focus:outline-2 focus:outline-black'
    ]"
    data-reading-mode-button
    :data-reading-status="props.status"
    @click="emit('toggle')">
    <GraphicsPause v-if="props.status === 'playing'" class="text-xl" />
    <GraphicsPlay v-else class="text-xl" />
    {{ label }}
  </button>
</template>

<script setup lang="ts">
import type { ReadingStatus } from '~/utilities/reading-mode/controller'
import { COVER_LINK_STYLE_CLASS } from '~/utilities/reef-cover-link'

type Props = {
  status: ReadingStatus
}

const props = defineProps<Props>()

const emit = defineEmits<{ toggle: [] }>()

const label = computed(() => {
  switch (props.status) {
    case 'playing':
      return 'Pause reading'
    case 'paused':
      return 'Resume reading'
    case 'idle':
      return 'Read aloud'
  }
})
</script>
