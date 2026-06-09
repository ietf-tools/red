<template>
  <button
    ref="buttonRef"
    type="button"
    @click="handleClick"
    :aria-label="props.ariaLabel"
    :class="[
      'inline-flex flex-row items-center gap-1  rounded mt-1 border-1 font-bold border-b-2 border-gray-400 cursor-pointer bg-white dark:bg-black px-2 hover:bg-gray-100 dark:hover:bg-gray-900',
      props.buttonClass
    ]">
    <slot />
  </button>
  <div
    ref="statusRef"
    :style="statusStyle"
    role="status"
    aria-live="polite"
    aria-atomic="true"
    :class="[
      'absolute top-10 z-100 transition-opacity shadow-3xl pb-1',
      visible ? 'opacity-100' : 'opacity-0',
      result ? 'relative rounded px-2 pt-1 text-xl pointer-none select-none' : '',
      result ? props.bubbleClass : '',
      {
        ['shadow-green-100/30 dark:shadow-green-800/30 bg-green-100 dark:bg-green-900 text-green-950 dark:text-white border-1 border-green-400 dark:border-green-600 pb-1']:
          result?.type === 'success',
        ['shadow-red-100/30 dark:shadow-red-800/30 bg-red-100 dark:bg-red-900 text-red-800 dark:text-white border-1 border-red-300 dark:border-red-600 pb-1']:
          result?.type === 'error'
      }
    ]">
    <template v-if="result">
      <div class="absolute -top-[9px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[9px] border-r-[9px] border-b-[9px] border-l-transparent border-r-transparent" :class="{
         'border-b-green-200 dark:border-b-green-700': result?.type === 'success',
         'border-b-red-200 dark:border-b-red-700': result?.type === 'error'
         }" />
      <div v-for="line in result.message">
        <div v-if="line.type === 'big'" class="text-lg font-bold text-center">{{ line.innerText }}</div>
        <div v-else-if="line.type === 'medium'" class="font-bold text-base text-center">{{ line.innerText }}</div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { StyleValue } from 'vue'
import type { ButtonResulClickHandler, ButtonResult } from '~/utilities/buttonSuccessFailure'
import { setTimeoutPromise } from '~/utilities/promises'
import type { VueStyleClass } from '~/utilities/vue'

type Props = {
  ariaLabel?: string
  bubbleContainerClass?: VueStyleClass
  buttonClass?: VueStyleClass
  bubbleClass?: VueStyleClass
  clickHandler: ButtonResulClickHandler
}
const props = defineProps<Props>()

const ANIMATION_DURATION_MS = 400

const button = useTemplateRef('buttonRef')
const status = useTemplateRef('statusRef')

const statusStyle = ref<StyleValue>()

const result = ref<ButtonResult | undefined>(undefined)
const visible = ref(false)

const updateStatusStyle = () => {
  if (!status.value || !button.value) {
    console.log('Expected to find status/button', { status: status.value, button: button.value })
    return
  }
  const buttonElement = button.value
  const statusElement = status.value
  console.log('width is', statusElement.offsetWidth)
  statusStyle.value = `position: absolute; right: -${(statusElement.offsetWidth / 2) - (buttonElement.offsetWidth / 2)}px; transition-duration: ${ANIMATION_DURATION_MS}ms`
}

onMounted(updateStatusStyle)

const handleClick = async (e: Event) => {
  result.value = await props.clickHandler()
  visible.value = true
  await nextTick()
  updateStatusStyle()
  await setTimeoutPromise(result.value.timeoutMs)
  visible.value = false
  await setTimeoutPromise(ANIMATION_DURATION_MS)
  result.value = undefined
}
</script>
