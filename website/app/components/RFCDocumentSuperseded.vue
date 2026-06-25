<template>
  <AlertBox v-if="props.data && props.data.length > 0" :variant="props.variant" class="relative ml-1 w-full pr-[50px]">
    <Toggle
      :model-value="supsersededModeRef === 'compact'"
      title="Compact display"
      aria-label="Compact display"
      :aria-controls="domId"
      class="group absolute right-0 top-0 text-gray-600 dark:text-white flex h-[36px] w-[36px] items-center justify-center rounded-xs cursor-pointer"
      @update:model-value="toggleSupersededMode">
      <GraphicsChevron class="inline-block rotate-0 group-data-[state=on]:-rotate-90" width="14" height="18" />
    </Toggle>
    <div class="block text-base" :id="domId">
      <b
        :class="[
          'inline print:border-black print:text-black',
          {
            'text-red-800 dark:text-red-200': props.variant === 'warning',
            'text-yellow-800 dark:text-yellow-300': props.variant === 'info'
          }
        ]"
        >{{ props.headingText }}<template v-if="supsersededModeRef === 'compact'">, see </template
        ><template v-else>, see </template>
      </b>
      <ul
        :class="[
          {
            block: supsersededModeRef === 'full',
            inline: supsersededModeRef === 'compact'
          }
        ]">
        <li
          v-for="(item, index) in props.data"
          :key="index"
          :class="{
            block: supsersededModeRef === 'full',
            inline: supsersededModeRef === 'compact'
          }">
          <AMaybeRFCLink
            :href="infoSeriesPathBuilder(`RFC${item.number}`)"
            :class="ANCHOR_COLOR_IN_ALERT_INFO_TAILWIND_STYLE">
            <RFCTitle :rfc="item" :hide-title="supsersededModeRef === 'compact'" />
          </AMaybeRFCLink>
          <template v-if="supsersededModeRef === 'compact'">
            <template v-if="index < props.data.length - 1">{{ COMMA }}{{ SPACE }} </template
            ><template v-else>{{ FULLSTOP }}</template>
          </template>
        </li>
      </ul>
    </div>
  </AlertBox>
</template>

<script setup lang="ts">
import { Toggle } from 'reka-ui'
import { storeToRefs } from 'pinia'
import type { RfcCommon } from '~/utilities/rfc-validators'
import { ANCHOR_COLOR_IN_ALERT_INFO_TAILWIND_STYLE } from '~/utilities/theme'
import { infoSeriesPathBuilder } from '~/utilities/url'
import type { Variant } from '~/utilities/alert'
import { COMMA, FULLSTOP, SPACE } from '~/utilities/strings'

type Props = {
  data: RfcCommon['obsoleted_by'] | RfcCommon['updated_by']
  variant: Variant
  headingText: string
  uiSettingsKey: RFCUiKey
}

const props = defineProps<Props>()

const domId = useId()

const rfcUiStore = useRfcUiStore()
const storeRefs = storeToRefs(rfcUiStore)
const supsersededModeRef = storeRefs[props.uiSettingsKey]
const { setSupersededMode } = rfcUiStore

const toggleSupersededMode = () => {
  setSupersededMode(props.uiSettingsKey, supsersededModeRef.value === 'compact' ? 'full' : 'compact')
}
</script>
