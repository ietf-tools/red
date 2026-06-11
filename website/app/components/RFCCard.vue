<template>
  <Card
    :href="infoSeriesPathBuilder(`RFC${props.rfc.number}`)"
    :heading-level="props.headingLevel"
    has-cover-link
    chevron-position="center"
    :class="props.showAbstract && props.rfc.abstract ? 'lg:flex' : undefined"
    :default-slot-class="props.showAbstract && props.rfc.abstract ? 'pr-4' : ''"
    :aside-slot-class="
      props.showAbstract && props.rfc.abstract ? 'flex-1 lg:w-1/2 xl:w-3/5 border-l pl-12 pr-4' : undefined
    "
    heading-class="text-gray-800 dark:text-gray-200 font-feature-settings-calt-off">
    <template #headingTitle>
      <component :is="formattedTitle" />
    </template>
    <template #afterHeadingTitle>
      {{
        ''
        /**
         * Considering changing CSS `relative` or `z-index` here?
         * The subseries link should appear "above" (in the `z-index` sense) the `Card`'s cover link.
         * Eg "BCP 14" on the card for RFC2119 should appear above the card.
         * A good RFC to test changes on is RFC 9966 which has a link to RFC 2119, so the `RFCLinkPreview`
         * `HoverCard` has a complex stacking order:
         *   Reka UI HoverCard, then Card, card background tint, card cover link, and subseries link "BCP 14".
         * Be sure to test search results (eg RFC 2119) too, because they raise a 'Show Abstract' button
         * (mobile only) above the `Card`'s cover link, so it's the same issue.
         */
      }}
      {{ SPACE }}
      <RFCTitleSubseries :rfc="props.rfc" has-trailing-colon :has-underline="false" />
      <span class="relative z-3 font-normal"> {{ SPACE }}{{ props.rfc.title }} </span>
    </template>
    <template #default>
      <RFCCardBody :rfc="props.rfc" :show-abstract="props.showAbstract" :show-tag-date="props.showTagDate" />
      <div v-if="props.showAbstract && !!props.rfc.abstract" class="relative z-1 hidden lg:block">
        <!-- desktop abstract -->
        <Heading
          :level="abstractHeadingLevel"
          style-level="5"
          class="text-blue-900 dark:text-gray-300 inline-block mt-3 pt-2 border-t-1 border-gray-200">
          Abstract
        </Heading>
        <div
          class="leading-snug text-black dark:text-white pb-2 text-pretty"
          v-html="
            props.rfc.abstract // this should already be sanitised
          "></div>
      </div>
    </template>
  </Card>
</template>

<script setup lang="ts">
import { infoSeriesPathBuilder } from '../utilities/url'
import { formatTitleAsVNode } from '~/utilities/rfc-title'
import type { RfcCommon } from '~/utilities/rfc'
import { useResponsiveModeStore } from '~/stores/responsiveMode'
import { parseHeadingLevel, type HeadingLevel } from '~/utilities/html'
import { SPACE } from '~/utilities/strings'

type Props = {
  rfc: RfcCommon
  showAbstract?: boolean
  showTagDate?: boolean
  headingLevel?: HeadingLevel
}

const props = withDefaults(defineProps<Props>(), { headingLevel: '1' })

const abstractHeadingLevel = computed(() => parseHeadingLevel((parseFloat(props.headingLevel) + 1).toString()))

const formattedTitle = computed(() => formatTitleAsVNode(`rfc${props.rfc.number}`, true))

const responsiveModeStore = useResponsiveModeStore()
</script>
