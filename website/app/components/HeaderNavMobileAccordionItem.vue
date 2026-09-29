<template>
  <AccordionItem v-slot="{ open }" :value="props.id" class="p-0">
    <AccordionTrigger
      class="flex flex-row w-full justify-between items-center border border-gray-500 hover:bg-blue-400 focus:bg-blue-400">
      <span
        :class="[
          'flex flex-row gap-4',
          {
            'p-4': props.styleDepth === 1,
            'px-6 py-3': props.styleDepth === 2
          }
        ]">
        <HeaderNavIcon v-if="props.triggerIcon" :icon="props.triggerIcon" class="w-6" />

        {{ props.triggerText }}
      </span>
      <GraphicsChevron
        :class="{
          'mr-4 size-4 text-white': true,
          'rotate-180': open
        }" />
    </AccordionTrigger>
    <AccordionContent>
      <slot />
    </AccordionContent>
  </AccordionItem>
</template>

<script setup lang="ts">
import { AccordionContent, AccordionItem, AccordionTrigger } from 'reka-ui'
import type { MenuItem } from './HeaderNavData'

type Props = {
  /** Text of the button to toggle the accordion item */
  triggerText: string | VNode
  triggerIcon?: MenuItem['icon']
  id: string
  /**
   * Styles the accordion at a certain nesting depth. ie, an accordion
   * within another accordion would have styleDepth=2 and be styled
   * differently (smaller).
   */
  styleDepth?: 1 | 2
}

const props = withDefaults(defineProps<Props>(), { styleDepth: 1 })
</script>
