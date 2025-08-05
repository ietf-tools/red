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
    class="flex flex-row items-center"
    container-class="flex"
  >
    <template #headingTitle>
      <component :is="formatTitleAsVNode(`rfc${props.rfc.number}`)" />
    </template>
    <p
      class="ml-4 pl-4 border-l-1 border-gray-300 text-base text-blue-900 dark:text-white flex items-center"
    >
      {{ props.rfc.title }}
    </p>
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
  headingLevel?: HeadingLevel
}

const props = withDefaults(defineProps<Props>(), { headingLevel: '1' })

const responsiveModeStore = useResponsiveModeStore()
</script>
