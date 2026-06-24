<template>
  <AlertBox v-if="props.data && props.data.length > 0" :variant="props.variant" class="ml-1 w-full min-h-14">
    <ToggleGroupRoot
      :model-value="supersededMode"
      type="single"
      class="float-right flex flex-row border border-gray-400 dark:bg-black dark:border-white shadow-sm rounded-xs"
      @update:model-value="ensureSelectedValue">
      <ToggleGroupItem value="full" title="Full Display" aria-label="Full Display" :class="toggleGroupItemClasses">
        <Icon name="f7:rectangle-grid-1x2-fill" class="w-[15px] h-[15px]" />
      </ToggleGroupItem>
      <ToggleGroupItem
        value="compact"
        title="Compact Display"
        aria-label="Compact Display"
        :class="toggleGroupItemClasses">
        <Icon name="vaadin:list" class="w-[15px] h-[15px]" />
      </ToggleGroupItem>
    </ToggleGroupRoot>
    <div class="text-base">
      <b
        :class="[
          'inline mr-2 print:border-black print:text-black',
          {
            'text-red-800 dark:text-red-200': props.variant === 'warning',
            'text-yellow-800 dark:text-yellow-300': props.variant === 'info'
          }
        ]"
        >{{ props.headingText }}<template v-if="supersededMode === 'compact'">.</template>
      </b>
      <p
        :class="{
          'inline clear-none': supersededMode === 'compact',
          block: supersededMode === 'full'
        }">
        {{ props.introText }}
      </p>
      <ul
        :class="[
          {
            'inline-block': supersededMode === 'full',
            inline: supersededMode === 'compact'
          }
        ]">
        <li
          v-for="(item, index) in props.data"
          :key="index"
          :class="{
            block: supersededMode === 'full',
            inline: supersededMode === 'compact'
          }">
          <AMaybeRFCLink
            :href="infoSeriesPathBuilder(`RFC${item.number}`)"
            :class="ANCHOR_COLOR_IN_ALERT_INFO_TAILWIND_STYLE">
            <RFCTitle :rfc="item" :hide-title="supersededMode === 'compact'" />
          </AMaybeRFCLink>
          <template v-if="supersededMode === 'compact'">
            <template v-if="index < props.data.length - 1">{{ COMMA }}{{ SPACE }} </template
            ><template v-else>{{ FULLSTOP }}</template>
          </template>
        </li>
      </ul>
    </div>
  </AlertBox>
</template>

<script setup lang="ts">
import { ToggleGroupItem, ToggleGroupRoot, type AcceptableValue } from 'reka-ui'
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
  introText: string
}

const props = defineProps<Props>()

const rfcUiStore = useRfcUiStore()
const { supersededMode } = storeToRefs(rfcUiStore)
const { setSupersededMode } = rfcUiStore

const toggleGroupItemClasses =
  'hover:bg-gray-100 dark:hover:bg-gray-800 text-sky-950 dark:text-white data-[state=on]:bg-gray-200 dark:data-[state=on]:bg-gray-700 flex h-[36px] w-[36px] items-center justify-center bg-white dark:bg-black first:rounded-l-xs last:rounded-r-xs cursor-pointer'

const ensureSelectedValue = (val: AcceptableValue) => {
  const { data, error } = SupersededModeSchema.safeParse(val)
  if (!data || error) {
    console.error('Unable to update value')
    return
  }
  setSupersededMode(data)
}
</script>
