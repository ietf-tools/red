<template>
  <Card :href="infoSeriesPathBuilder(`RFC${props.rfc.number}`)" :heading-level="props.headingLevel" has-cover-link
    :chevron-position="props.rfc.abstract && responsiveModeStore.responsiveMode === 'Desktop' ?
      'center'
      : 'end'
      " class="flex flex-row items-center" container-class="flex"
    :heading-class="`flex flex-col md:flex-row grow-0 shrink-0 ${TEMPLATE_STRING_PLACEHOLDER_FOR_CODE_COMMENT
      // converting char length to width in a non-monospace/variable-width font isn't exact so this should er on the side of wider numbers
      // Be sure to test with search for BCP finding result RFC 8996: BCP 195 for a near worst case width
      // and test responsive modes
      } basis-[calc(var(--computed-heading-char-length)*0.34em)] md:basis-[calc(var(--computed-heading-char-length)*0.61em)]`">
    <template #headingTitle>
      <component :is="formattedTitleWithSuffix" />
    </template>
    <template #afterHeadingTitle>
      {{ NONBREAKING_SPACE }}
      <RFCTitleSubseries :rfc="props.rfc" :has-trailing-colon="false" />
    </template>
    <p
      class="ml-2 pl-4 border-l-1 border-gray-300 dark:border-gray-600 text-base text-blue-900 dark:text-white flex items-center">
      {{ props.rfc.title }}
    </p>
  </Card>
</template>

<script setup lang="ts">
import { infoSeriesPathBuilder } from '../utilities/url'
import type { RfcCommon } from '~/utilities/rfc'
import { useResponsiveModeStore } from '~/stores/responsiveMode'
import type { HeadingLevel } from '~/utilities/html'
import { NONBREAKING_SPACE, TEMPLATE_STRING_PLACEHOLDER_FOR_CODE_COMMENT } from '~/utilities/strings'
import { formatTitleAsVNode, hasSubseries } from '~/utilities/rfc-title'

type Props = {
  rfc: RfcCommon
  headingLevel?: HeadingLevel
}

const props = withDefaults(defineProps<Props>(), { headingLevel: '1' })

const formattedTitleWithSuffix = computed(() => formatTitleAsVNode(`rfc${props.rfc.number}`, hasSubseries(props.rfc)))

const responsiveModeStore = useResponsiveModeStore()
</script>
