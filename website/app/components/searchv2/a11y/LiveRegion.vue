<template>
  <div role="status" aria-live="polite" aria-atomic="true" :style="visible ? undefined : SR_ONLY_STYLE">
    {{ announced }}
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { debounce } from '../utils/debounce'
import { SR_ONLY_STYLE } from '../utils/srOnly'

type Props = {
  /** Text to announce. Announcement is debounced so rapid changes settle into one. */
  message?: string
  /** Debounce before announcing, so keystroke-driven updates do not flood the buffer. */
  delayMs?: number
  /** When false, the region is visually hidden (still announced) for text not meant to be seen. */
  visible?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  message: '',
  delayMs: 200,
  visible: true
})

const announced = ref(props.message)
const update = debounce((next: string) => {
  announced.value = next
}, props.delayMs)

watch(
  () => props.message,
  (next) => update(next)
)

onBeforeUnmount(() => update.cancel())
</script>
