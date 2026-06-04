<template>
  <button
    type="button"
    class="copy-unfolded"
    :aria-label="label"
    @click.prevent.stop="handleClick"
  >
    {{ label }}
  </button>
</template>

<script setup lang="ts">
import { copyToClipboard } from '~/utilities/clipboard'

type Props = {
  text: string
}

const props = defineProps<Props>()

const defaultLabel = 'Copy unfolded'
const label = ref(defaultLabel)
let resetTimer: ReturnType<typeof setTimeout> | undefined

const setTemporaryLabel = (newLabel: string) => {
  label.value = newLabel

  if (resetTimer) {
    clearTimeout(resetTimer)
  }

  resetTimer = setTimeout(() => {
    label.value = defaultLabel
    resetTimer = undefined
  }, 1600)
}

const handleClick = async () => {
  const copied = await copyToClipboard(props.text)
  setTemporaryLabel(copied ? 'Copied' : 'Error')
}

onUnmounted(() => {
  if (resetTimer) {
    clearTimeout(resetTimer)
  }
})
</script>
