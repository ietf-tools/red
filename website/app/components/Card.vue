<template>
  <div
    :class="[
      'bg-white dark:bg-blue-950 relative border-1 border-gray-100 dark:border-1 dark:border-gray-500 pl-5 pr-7 py-4 rounded shadow-xs print:border-2 print:border-black',
      props.class
    ]">
    <div :class="props.containerClass">
      <Heading :level="props.headingLevel" :class="`text-[22px] ${props.headingClass ? props.headingClass : ''}`">
        <NuxtLink
          :to="props.href"
          :class="[
            'font-semibold text-blue-300 dark:text-blue-100 print:text-black no-underline group',
            props.hasCoverLink &&
              `before:absolute before:content-[\'\'] before:inset-0 before:rounded ${
                // below the content
                'before:z-0'
              } after:absolute after:content-[\'\'] after:inset-0 ${
                // above the content
                'after:z-40'
              } after:transition-all ${
                // card tint
                `hover:text-blue-400 focus:text-blue-400 dark:hover:text-blue-100 dark:focus:text-blue-100 hover:before:bg-blue-25 focus:before:bg-blue-25 dark:hover:before:bg-blue-900 dark:focus:before:bg-blue-900`
              } ${
                // Card shadow
                `after:shadow-blue-950/10 dark:after:shadow-blue-100/10 hover:after:shadow-3xl focus:after:shadow-3xl dark:hover:after:shadow-3xl dark:hover:after:shadow-3xl`
              } ${
                /* must be able to have <slot /> content above the coverLink, so coverlink is z-40 and slot content (eg subseries links like 'BCP 3' after the RFC link) could be z-50 to rise above it */
                ''
              }`
          ]">
          <span class="relative z-1">
            <slot name="headingTitle">slot #headingTitle</slot>
          </span>
          <span v-if="!props.hasCoverLink" class="block absolute right-0 w-10 h-full top-0">
            <!-- for a larger click area along the right-hand side -->
          </span>
          <GraphicsChevron
            width="14"
            height="21"
            :class="[
              'absolute right-4 text-gray-200 group-hover:text-blue-400 group-focus:text-blue-400 dark:group-hover:text-blue-100 dark:group-focus:text-blue-100 transition-all group-hover:right-3 group-focus:right-3 -rotate-90 print:hidden',
              props.chevronPosition === 'center' ? 'bottom-[50%]' : 'bottom-4'
            ]" />
        </NuxtLink>
        <span
          :class="`${
            // don't set `relative` or z-index on this as it will affect z-index layering of afterHeadingTitle subseries links from RFC card eg RFC 2119 'BCP' link
            ''
          }`">
          <slot name="afterHeadingTitle"></slot>
        </span>
      </Heading>
      <div :class="`${
            // don't set `relative` or z-index on this as it will affect z-index layering of RFC Card 'Show abstract' buttons
            ''
          }`">
        <slot />
      </div>
    </div>
    <aside v-if="hasAsideSlot" :class="props.asideSlotClass">
      <slot name="aside"></slot>
    </aside>
  </div>
</template>

<script setup lang="ts">
import { useFeatureFlags } from '~/utilities/feature-flags'
import type { VueStyleClass } from '../utilities/vue'
import type { HeadingLevel } from '~/utilities/html'

type Props = {
  class?: VueStyleClass
  defaultSlotClass?: VueStyleClass
  asideSlotClass?: VueStyleClass
  containerClass?: VueStyleClass
  headingClass?: string
  headingLevel: HeadingLevel
  hasCoverLink?: boolean
  href: string
  chevronPosition?: 'center' | 'end'
}

const props = withDefaults(defineProps<Props>(), { chevronPosition: 'end' })

const slots = useSlots()
const hasAsideSlot = computed(() => !!slots['aside'])
</script>
