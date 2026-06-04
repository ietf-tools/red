<template>
  <div class="overflow-x-hidden overflow-y-scroll px-4 pt-3 pb-5">
    <GraphicsIETFMotif class="absolute text-black w-[110px] h-[100px] right-0 top-0 print:hidden" :opacity="0.04" />
    <Heading level="3" class="text-blue-900 dark:text-white leading-8 font-feature-settings-calt-off">
      <Anchor
        :href="infoSeriesPathBuilder(`rfc${props.rfc.number}`)"
        class="no-underline hover:underline focus:underline">
        <component :is="formattedTitle" />:
        <span class="font-normal">
          {{ props.rfc.title }}
        </span>
      </Anchor>
    </Heading>

    <RFCCardBody :rfc="props.rfc" :show-abstract="false" :show-tag-date="true" />

    <Heading level="4" style-level="5" class="mt-2 text-gray-800 dark:text-gray-300">Abstract</Heading>
    <div
      class="mt-3 border-t-1 border-t-gray-300 dark:border-t-gray-500 leading-7 pt-2 text-pretty"
      v-html="sanitisedAbstract"></div>
  </div>
</template>

<script setup lang="ts">
import { infoSeriesPathBuilder } from '../utilities/url'
import Anchor from './Anchor.vue'
import { formatTitleAsVNode } from '~/utilities/rfc-title'
import type { RfcCommon } from '~/utilities/rfc-validators'
import { analyticsMatomoTrackLinkPreview } from '~/utilities/analytics-matomo'
import { sanitiseHtml } from '~/utilities/html'

type Props = {
  rfc: RfcCommon
}

const props = defineProps<Props>()

onMounted(() => {
  analyticsMatomoTrackLinkPreview(`rfc${props.rfc.number}`)
})

const formattedTitle = computed(() => formatTitleAsVNode(`rfc${props.rfc.number}`))

const sanitisedAbstract = computed(() => (props.rfc.abstract ? sanitiseHtml(props.rfc.abstract) : ''))
</script>
