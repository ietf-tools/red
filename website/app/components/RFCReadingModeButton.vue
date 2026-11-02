<template>
  <button
    ref="buttonElement"
    type="button"
    :class="[
      'flex flex-col sm:flex-row items-center',
      'pl-1 pr-2 py-1 min-[380px]:gap-1',
      'cursor-pointer',
      'rounded',
      'text-sm text-center md:text-left',
      'font-bold',
      'after:transition-all',
      'text-blue-900 dark:text-blue-100 hover:text-blue-400 focus:text-blue-400 dark:hover:text-white dark:focus:text-white hover:bg-sky-100 focus:bg-sky-100 dark:hover:bg-blue-900 dark:focus:bg-blue-900',
      'border-2 border-transparent rounded hover:border-black focus:border-black dark:hover:border-blue-25 dark:focus:border-blue-25 outline-0'
    ]"
    data-reading-mode-button
    :data-reading-status="props.status"
    :aria-pressed="props.isOpen"
    @click="emit('toggle')">
    <GraphicsPlay class="text-xl" />
    Read aloud
  </button>
</template>

<script setup lang="ts">
import type { ReadingStatus } from '~/utilities/reading-mode/controller'

type Props = {
  status: ReadingStatus
  isOpen: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{ toggle: [] }>()

const buttonElement = useTemplateRef('buttonElement')

defineExpose({ focus: () => buttonElement.value?.focus() })
</script>
