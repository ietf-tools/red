<template>
  <Card :href="infoSeriesPathBuilder(`RFC${props.rfc.number}`)" :heading-level="props.headingLevel" has-cover-link
    :chevron-position="props.rfc.abstract && responsiveModeStore.responsiveMode === 'Desktop' ?
        'center'
        : 'end'
      " class="flex flex-row items-center" container-class="flex" :heading-class="`grow-0 shrink-0 ${
      ''
    // converting char length to width in a non-monospace/variable-width font isn't exact so this should er on the side of wider numbers
    } basis-[calc(var(--computed-heading-char-length)*0.6em)]`">
    <template #headingTitle>
      <component :is="formatTitleAsVNode(`rfc${props.rfc.number}`)" />
    </template>
    <template #afterHeadingTitle>
      <RFCTitleSubseries :rfc="props.rfc" />
    </template>
    <p class="ml-4 pl-4 border-l-1 border-gray-300 text-base text-blue-900 dark:text-white flex items-center">
      {{ props.rfc.title }}
    </p>
  </Card>
</template>

<script setup lang="ts">
import { infoSeriesPathBuilder } from '../utilities/url'
import { formatTitleAsVNode } from '~/utilities/rfc'
import type { RfcCommon } from '~/utilities/rfc'
import { useResponsiveModeStore } from '~/stores/responsiveMode'
import type { HeadingLevel } from '~/utilities/html'

type Props = {
  rfc: RfcCommon
  headingLevel?: HeadingLevel
}

const props = withDefaults(defineProps<Props>(), { headingLevel: '1' })

const responsiveModeStore = useResponsiveModeStore()
</script>
