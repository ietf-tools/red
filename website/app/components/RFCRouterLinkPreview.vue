<template>
  <div class="overflow-x-hidden overflow-y-scroll px-4 pt-3 pb-5">
    <GraphicsIETFMotif class="absolute text-black w-[110px] h-[100px] right-0 top-0 print:hidden" :opacity="0.04" />
    <RFCCard heading-level="3" :rfc="props.rfc" :show-abstract="false" :show-tag-date="true" />
    <template v-if="sanitisedAbstract.length > 0">
      <Heading level="4" style-level="5" class="mt-3 mx-5 text-gray-800 dark:text-gray-300">Abstract</Heading>
      <div
        class="mt-3 mx-5 border-t-1 border-t-gray-300 dark:border-t-gray-500 leading-7 pt-2 text-pretty"
        v-html="sanitisedAbstract"></div>
    </template>
  </div>
</template>

<script setup lang="ts">
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

const sanitisedAbstract = computed(() => (props.rfc.abstract ? sanitiseHtml(props.rfc.abstract) : ''))
</script>
