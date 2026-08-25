<template>
  <BaseCard :override-class-defaults="props.overrideClassDefaults" :class="props.class">
    <div :class="props.containerClass">
      <Heading :level="props.headingLevel" :class="`text-[22px] ${props.headingClass ? props.headingClass : ''}`">
        <CardLink :href="props.href" :chevron-position="props.chevronPosition" :has-cover-link="props.hasCoverLink">
          <slot name="headingTitle">slot #headingTitle</slot>
        </CardLink>
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
    <template v-if="hasEndSlot">
      <slot name="end"></slot>
    </template>
  </BaseCard>
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
const hasEndSlot = computed(() => !!slots['end'])
</script>
