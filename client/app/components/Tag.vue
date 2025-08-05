<template>
  <div
    :class="[
      'inline-flex items-center bg-blue-400 dark:bg-blue-800 print:bg-white text-white print:text-black print:text-sm uppercase',
      props.class,
      {
        'screen:[clip-path:polygon(0%_50%,_6%_0%,_96%_0%,100%_50%,96%_100%,6%_100%)]':
          totalTextLength < 5,
        'screen:[clip-path:polygon(0%_50%,_10%_0%,_90%_0%,100%_50%,90%_100%,10%_100%)]':
          totalTextLength >= 5 && totalTextLength <= 10,
        'screen:[clip-path:polygon(0%_50%,_5%_0%,_95%_0%,100%_50%,95%_100%,5%_100%)]':
          totalTextLength > 10 && totalTextLength <= 15,
        'screen:[clip-path:polygon(0%_50%,_4%_0%,_96%_0%,100%_50%,96%_100%,4%_100%)]':
          totalTextLength > 15,
        'text-base font-semibold': props.size === 'normal',
        'text-xs font-semibold': props.size === 'small'
      }
    ]"
  >
    <template v-if="props.text.length === 1">
      <span
        :class="{
          'whitespace-nowrap inline-block': true,
          'px-3 py-1 print:px-0': props.size === 'normal',
          'px-2 py-0.5 print:px-0': props.size === 'small'
        }"
      >
        <Renderable :val="props.text[0]" />
      </span>
    </template>
    <template v-else-if="props.text.length === 2">
      <span
        :class="{
          'print:p-0 whitespace-nowrap': true,
          'pl-5 pr-2 py-2': props.size === 'normal',
          'pl-3 pr-1 py-0.5': props.size === 'small'
        }"
      >
        <Renderable :val="props.text[0]" />
      </span>
      <span
        :class="{
          'whitespace-nowrap print:py-0 bg-yellow-200 dark:bg-yellow-700 dark:text-white text-black print:text-black ': true,
          'pl-2 pr-5 py-2': props.size === 'normal',
          'pl-1 pr-3 py-0.5': props.size === 'small'
        }"
      >
        <Renderable :val="props.text[1]" />
      </span>
    </template>
    <template v-else>
      {{ props.text }}
    </template>
  </div>
</template>

<script setup lang="ts">
import type { VueStyleClass } from '~/utilities/vue'
import { getVNodeText } from '~/utilities/vue'

type Props = {
  text: (string | VNode)[]
  class?: VueStyleClass
  size?: 'normal' | 'small'
}

const props = withDefaults(defineProps<Props>(), {
  size: 'normal'
})

const totalTextLength = computed(() => {
  return props.text.reduce((acc, item): number => {
    return (
      acc + (typeof item === 'string' ? item.length : getVNodeText(item).length)
    )
  }, 0)
})
</script>
