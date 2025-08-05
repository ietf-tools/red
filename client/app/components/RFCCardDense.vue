<template>
  <Card
    :href="infoRfcPathBuilder(`RFC${props.rfc.number}`)"
    :heading-level="props.headingLevel"
    has-cover-link
    :chevron-position="
      props.rfc.abstract && responsiveModeStore.responsiveMode === 'Desktop' ?
        'center'
      : 'end'
    "
    :class="props.showAbstract && props.rfc.abstract ? 'lg:flex' : undefined"
    :default-slot-class="
      props.showAbstract && props.rfc.abstract ?
        'lg:w-1/2 xl:w-2/5 pr-4'
      : undefined
    "
    :aside-slot-class="
      props.showAbstract && props.rfc.abstract ?
        'lg:w-1/2 xl:w-3/5 border-l pl-12 pr-4'
      : undefined
    "
  >
    <template #headingTitle>
      <component :is="formatTitleAsVNode(`rfc${props.rfc.number}`)" />
    </template>
    <template #default>
      <RFCCardBody
        :rfc="props.rfc"
        :show-abstract="props.showAbstract"
        :show-tag-date="props.showTagDate"
      />
    </template>
  </Card>
</template>

<script setup lang="ts">
import { infoRfcPathBuilder } from '../utilities/url'
import { formatTitleAsVNode } from '~/utilities/rfc'
import type { RfcCommon } from '~/utilities/rfc'
import { useResponsiveModeStore } from '~/stores/responsiveMode'
import type { HeadingLevel } from '~/utilities/html'

type Props = {
  rfc: RfcCommon
  showAbstract?: boolean
  showTagDate?: boolean
  headingLevel?: HeadingLevel
}

const props = withDefaults(defineProps<Props>(), { headingLevel: '1' })

const responsiveModeStore = useResponsiveModeStore()
</script>
