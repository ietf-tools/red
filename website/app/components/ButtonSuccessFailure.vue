<template>
  <button
    ref="buttonRef"
    type="button"
    @click="handleClick"
    :aria-label="props.ariaLabel"
    :class="[
      'absolute right-0 top-[0px] inline-flex items-center px-1.5 py-1 rounded mt-1 font-bold text-sm border-1 border-b-3 border-transparent hover:border-gray-400 focus:border-gray-400 dark:hover:border-gray-700 dark:focus:border-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-900 hover:z-100 focus:z-100 active:border-b-1 active:top-[1px]',
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
      'absolute top-11 z-100 transition-opacity  pb-1',
      visible ? 'opacity-100' : 'opacity-0',
      result ? 'relative rounded px-2 pt-1 text-xl pointer-none select-none' : '',
      result ? props.bubbleClass : '',
      {
        ['shadow-green-50/70 dark:shadow-green-800/30 bg-green-50 dark:bg-green-950 text-green-950 dark:text-white border-1 border-green-700 dark:border-green-800 pb-1']:
          result?.type === 'success',
        ['shadow-red-100/30 dark:shadow-red-800/30 bg-red-100 dark:bg-red-900 text-red-800 dark:text-white border-1 border-red-300 dark:border-red-600 pb-1']:
          result?.type === 'error'
      }
    ]">
    <template v-if="result">
      <div
        :style="arrowStyle"
        class="inline-block w-[10px] h-[10px] -rotate-135 absolute -top-[5px] right-1/2 -translate-x-1/2 p-[5px] border-r-[1px] border-b-[1px] border-black bg-gray-100 dark:bg-gray-800 [clip-path:polygon(0%_100%,100%_100%,100%_0%,75%_25%,25%_75%)]"
        :class="{
          // the arrow
          'border-green-600 dark:border-green-700': result?.type === 'success',
          'border-red-200 dark:border-red-700': result?.type === 'error'
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
const arrowStyle = ref<StyleValue>()

const result = ref<ButtonResult | undefined>(undefined)
const visible = ref(false)

const updateStatusStyle = () => {
  const { value: statusElement } = status
  const { value: buttonElement } = button

  if (!statusElement || !buttonElement) {
    console.log('Expected to find status/button', { status: status.value, button: button.value })
    return
  }

  const statusRect = statusElement.getBoundingClientRect()
  const buttonRect = buttonElement.getBoundingClientRect()

  const ARROW_WIDTH_PX = 10
  console.log('width is', statusElement.offsetWidth)
  const BUFFER_PX = statusRect.width
  const rightPx = buttonRect.left + buttonRect.width + BUFFER_PX > window.innerWidth ? 0 : -(statusRect.width / 2)
  statusStyle.value = `position: absolute; right: ${rightPx}px; transition-duration: ${ANIMATION_DURATION_MS}ms`

  arrowStyle.value = `right: ${-rightPx + ARROW_WIDTH_PX / 2}px`
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
