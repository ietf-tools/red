<template>
  <button
    type="button"
    class="cursor-pointer inline-flex items-center gap-2 px-3 py-1 text-base lg:text-sm rounded border-1 border-gray-400 dark:border-gray-500 bg-white dark:bg-black text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-900"
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
