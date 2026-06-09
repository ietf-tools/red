<template>
  <button
    type="button"
    @click="handleClick"
    :aria-label="props.ariaLabel"
    :class="[
      'rounded mt-1 border-1 font-bold border-gray-400 cursor-pointer bg-white dark:bg-black px-2 hover:bg-gray-100 dark:hover:bg-gray-900',
      props.buttonClass
    ]">
    <slot />
  </button>
  <div :class="props.bubbleContainerClass">
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      :class="[
        result ? 'relative rounded px-2 py-1 font-bold text-xl pointer-none select-none' : '',
        result ? props.bubbleClass : '',
        {
          ['bg-green-200 dark:bg-green-700 text-green-800 dark:text-white border-1 border-green-800 dark:border-white']:
            result?.type === 'success',
          ['bg-red-100 dark:bg-red-700 text-red-800 dark:text-white border-1 border-red-800 dark:border-white']:
            result?.type === 'error'
        }
      ]">
      <template v-if="result">
        <div v-for="line in result.message">
          <div v-if="line.type === 'big'" class="text-lg text-center">{{ line.innerText }}</div>
          <div v-else-if="line.type === 'medium'" class="text-base text-center">{{ line.innerText }}</div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
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

const result = ref<ButtonResult | undefined>(undefined)

const handleClick = async (e: Event) => {
  result.value = await props.clickHandler()
  await setTimeoutPromise(result.value.timeoutMs)
  result.value = undefined
}
</script>
