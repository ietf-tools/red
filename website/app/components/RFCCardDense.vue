<template>
  <Card
    :href="infoSeriesPathBuilder(`RFC${props.rfc.number}`)"
    :heading-level="props.headingLevel"
    has-cover-link
    :chevron-position="props.rfc.abstract && responsiveModeStore.responsiveMode === 'Desktop' ? 'center' : 'end'"
    :class="props.showAbstract && props.rfc.abstract ? 'lg:flex' : undefined"
    :default-slot-class="props.showAbstract && props.rfc.abstract ? 'lg:w-1/2 xl:w-2/5 pr-4' : undefined"
    :aside-slot-class="props.showAbstract && props.rfc.abstract ? 'lg:w-1/2 xl:w-3/5 border-l pl-12 pr-4' : undefined"
    :override-class-defaults="{
      'bg-pink-50 dark:bg-pink-950 border-pink-400 dark:border-pink-700': !!props.rfc.obsoleted_by?.length,
      'bg-white dark:bg-blue-950 border-gray-200 dark:border-gray-500': !props.rfc.obsoleted_by?.length
    }"
    heading-class="text-gray-800 dark:text-gray-200">
    <template #headingTitle>
      <component :is="formattedTitle" />
    </template>
    <template #afterHeadingTitle>
      {{ SPACE }}
      <RFCTitleSubseries :rfc="props.rfc" has-trailing-colon :has-underline="false" />
      <span class="relative z-3 font-normal">{{ SPACE }}{{ props.rfc.title }}</span>
    </template>
    <template #default>
      <RFCCardBody :rfc="props.rfc" :show-abstract="props.showAbstract" :show-tag-date="props.showTagDate" />
    </template>
    <template #end>
      <ul v-if="featureFlags.oidc" class="flex flex-col md:flex-row">
        <li><RFCCardSubscribe :rfc-number="props.rfc.number" icon-only /></li>
        <li><RFCCardSets :rfc-number="props.rfc.number" icon-only /></li>
      </ul>
    </template>
  </Card>
</template>

<script setup lang="ts">
import { infoSeriesPathBuilder } from '../utilities/url'
import { formatTitleAsVNode } from '~/utilities/rfc-title'
import type { RfcCommon } from '~/utilities/rfc'
import { useResponsiveModeStore } from '~/stores/responsiveMode'
import type { HeadingLevel } from '~/utilities/html'
import { SPACE } from '~/utilities/strings'
import { useFeatureFlags } from '~/utilities/feature-flags'

type Props = {
  rfc: RfcCommon
  showAbstract?: boolean
  showTagDate?: boolean
  headingLevel?: HeadingLevel
}

const props = withDefaults(defineProps<Props>(), { headingLevel: '1' })

const responsiveModeStore = useResponsiveModeStore()

const formattedTitle = computed(() => formatTitleAsVNode(`rfc${props.rfc.number}`, true))

const featureFlags = useFeatureFlags()
</script>
