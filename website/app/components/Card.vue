<template>
  <div
    :class="[
      'bg-white dark:bg-black relative dark:border-2 pl-5 pr-7 py-4 rounded shadow-xs print:border-2 print:border-black',
      props.class
    ]"
  >
    <div :class="props.containerClass">
      <Heading :level="props.headingLevel" class="text-[22px]">
        <NuxtLink
          :to="props.href"
          :class="[
            'font-bold text-blue-300 dark:text-blue-100 print:text-black no-underline focus:underline hover:underline group',
            props.hasCoverLink &&
              `before:absolute before:content-[\'\'] before:inset-0 before:transition-all dark:before:shadow-slate-700 hover:before:shadow-xl focus:before:shadow-xl dark:hover:before:shadow-[0_0px_40px_20px_#00101c] ${
                /* this is only a template string so I can write an inline comment:
                  must be able to have <slot /> content above the coverLink, so coverlink is z-40 and slot content (eg buttons) could be z-50 */ 'before:z-40'
              }`
          ]"
        >
          <slot name="headingTitle">slot #headingTitle</slot>
          <span
            v-if="!props.hasCoverLink"
            class="block absolute right-0 w-10 h-full top-0"
          >
            <!-- for a larger click area along the right-hand side -->
          </span>
          <GraphicsChevron
            width="14"
            height="21"
            :class="[
              'absolute right-4 text-gray-200 group-hover:text-blue-400 group-focus:text-blue-400 dark:group-hover:text-blue-100 dark:group-focus:text-blue-100 transition-all group-hover:right-3 group-focus:right-3 -rotate-90 print:hidden',
              props.chevronPosition === 'center' ? 'bottom-[50%]' : 'bottom-4'
            ]"
          />
        </NuxtLink>
        <slot name="afterHeadingTitle"></slot>
      </Heading>
      <slot />
    </div>
    <aside v-if="hasAsideSlot" :class="props.asideSlotClass">
      <slot name="aside"></slot>
    </aside>
  </div>
</template>

<script setup lang="ts">
import type { VueStyleClass } from '../utilities/vue'
import type { HeadingLevel } from '~/utilities/html'

type Props = {
  class?: VueStyleClass
  defaultSlotClass?: VueStyleClass
  asideSlotClass?: VueStyleClass
  containerClass?: VueStyleClass
  headingLevel: HeadingLevel
  hasCoverLink?: boolean
  href: string
  chevronPosition?: 'center' | 'end'
}

const props = withDefaults(defineProps<Props>(), { chevronPosition: 'end' })

const slots = useSlots()
const hasAsideSlot = computed(() => !!slots['aside'])
</script>
