<template>
  <BaseCard
    class="flex flex-row justify-between"
    :override-class-defaults="{
      'bg-pink-50 dark:bg-pink-950 border-pink-400 dark:border-pink-700': !!props.rfc.obsoleted_by?.length,
      'bg-white dark:bg-blue-950 border-gray-200 dark:border-gray-500': !props.rfc.obsoleted_by?.length
    }">
    <div class="grid grid-cols-[calc(var(--computed-heading-char-length)*1.1ch)_minmax(0,_1fr)_auto]">
      <span>
        <CardLink :href="infoSeriesPathBuilder(`RFC${props.rfc.number}`)" has-cover-link chevron-position="center">
          <component :is="formattedTitleWithSuffix" />
        </CardLink>
        {{ NONBREAKING_SPACE }}
        <RFCTitleSubseries :rfc="props.rfc" :has-trailing-colon="false" :has-underline="false" />
      </span>
      <p
        class="relative z-1 ml-2 pl-4 border-l-1 border-gray-300 dark:border-gray-600 text-base text-blue-900 dark:text-white flex items-start">
        {{ props.rfc.title }}
      </p>
      <RFCCardBodyPill :rfc="rfc" mode="none" class="col-span-2 mt-1" />
    </div>
    <ul v-if="featureFlags.oidc" class="flex flex-row">
      <li><RFCCardSubscribe :rfc-number="props.rfc.number" icon-only /></li>
      <li><RFCCardSets :rfc-number="props.rfc.number" icon-only /></li>
    </ul>
  </BaseCard>
</template>

<script setup lang="ts">
import { infoSeriesPathBuilder } from '../utilities/url'
import type { RfcCommon } from '~/utilities/rfc'
import type { HeadingLevel } from '~/utilities/html'
import { NONBREAKING_SPACE } from '~/utilities/strings'
import { formatTitleAsVNode, hasSubseries } from '~/utilities/rfc-title'
import { useFeatureFlags } from '~/utilities/feature-flags'

type Props = {
  rfc: RfcCommon
  headingLevel?: HeadingLevel
}

const props = withDefaults(defineProps<Props>(), { headingLevel: '1' })

const formattedTitleWithSuffix = computed(() => formatTitleAsVNode(`rfc${props.rfc.number}`, hasSubseries(props.rfc)))

const featureFlags = useFeatureFlags()
</script>
