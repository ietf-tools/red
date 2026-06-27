<template>
  <div
    :class="[
      props.overrideClassDefaults,
      'relative border pl-5 pr-7 py-4 rounded shadow-xs print:border-2 print:border-black',
      props.class
    ]">
    <div :class="props.containerClass">
      <Heading :level="props.headingLevel" :class="`text-[22px] ${props.headingClass ? props.headingClass : ''}`">
        <NuxtLink
          :to="props.href"
          :class="[
            'font-semibold text-blue-300 dark:text-blue-100 print:text-black no-underline group',
            props.hasCoverLink &&
              `${
                // the card background colour layer
                'before:absolute before:content-[\'\'] before:inset-0 before:rounded'
              } ${
                // card background layer should be below the slots z-index
                'before:z-0'
              } ${
                // the card cover link itself (increases clickable area of the link)
                'after:absolute after:content-[\'\'] after:inset-0'
              } ${
                // card cover link should be above the card background colour layer, so 40 is
                // an arbitrary choice.
                //
                // Generally slots content should be between these layers, so that means
                // z-index 1-39.
                //
                // however sometimes slot content intentionally rises above (eg RFCCard usage
                // of Card has Subseries links see RFC2119) and 'Show Abstract' buttons which
                // should be stacked above 40.
                'after:z-40'
              } after:transition-all ${
                // card tint when focus/hover
                `hover:text-blue-400 focus:text-blue-400 dark:hover:text-blue-100 dark:focus:text-blue-100 hover:before:bg-blue-25 focus:before:bg-blue-25 dark:hover:before:bg-blue-900 dark:focus:before:bg-blue-900`
              } ${
                // Card shadow
                `after:shadow-blue-950/10 dark:after:shadow-blue-100/10 hover:after:shadow-3xl focus:after:shadow-3xl dark:hover:after:shadow-3xl dark:hover:after:shadow-3xl after:rounded`
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
              props.chevronPosition === 'center' ? 'bottom-[45%]' : 'bottom-4'
            ]" />
        </NuxtLink>
        <span
          :class="`${
            // The lack of a `relative` or `z-index` here is a feature not a bug.
            // Don't set `relative` or z-index on this as it will affect z-index layering of afterHeadingTitle *subseries* links.
            // Instead wrap parts of your usage of Card's afterHeadingTitle slot in a z-index:
            //    eg `template #afterHeadingTitle div relative z-100 div template`
            ''
          }`">
          <slot name="afterHeadingTitle"></slot>
        </span>
      </Heading>
      <div
        :class="`${
          // The lack of a `relative` or `z-index` here is a feature not a bug.
          // Changing `relative` or z-index on this could affect z-index layering of RFCCard 'Show abstract' buttons.
          // Instead wrap parts of your usage of Card's slot in a z-index.
          // See also comment above.
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
  overrideClassDefaults?: VueStyleClass
}

const props = withDefaults(defineProps<Props>(), {
  chevronPosition: 'end',
  overrideClassDefaults: 'bg-white dark:bg-blue-950 border-gray-200 dark:border-gray-500'
})

const slots = useSlots()
const hasAsideSlot = computed(() => !!slots['aside'])
</script>
