<template>
  <div
    :class="[
      'inline-flex rounded-lg overflow-hidden print:text-sm',
      props.class,
      {
        'text-sm font-semibold': props.size === 'normal',
        'text-xs font-semibold': props.size === 'small'
      }
    ]"
  >
    <div
      v-for="(textItem, index) in props.text"
      :key="index"
      :class="{
        'py-1 uppercase': true,
        'px-2': props.size === 'small',
        'px-3': props.size === 'normal',
        'bg-blue-400 dark:bg-blue-800 text-white print:bg-white': index === 0,
        'bg-yellow-200 dark:bg-yellow-700 dark:text-white text-black print:text-black print:bg-white':
          index === 1,
        'bg-blue-300 dark:bg-blue-700': index >= 1
      }"
    >
      <Renderable :val="textItem" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { VueStyleClass } from '~/utilities/vue'

type Props = {
  text: (string | VNode)[]
  class?: VueStyleClass
  size?: 'normal' | 'small'
}

const props = withDefaults(defineProps<Props>(), {
  size: 'normal'
})
</script>
