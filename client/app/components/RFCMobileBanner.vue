<template>
  <div :class="[
    'flex flex-row w-full justify-between items-center py-1 bg-blue-900 text-white dark:bg-black dark:border-t dark:border-gray-400 shadow-[-5px_-5px_15px_rgba(0,0,0,0.2)] dark:shadow-[-5px_-5px_15px_rgba(0,0,0,0.25)] dark:shadow-blue-900',
    props.isFixed && 'fixed bottom-0 left-0 right-0 lg:hidden print:hidden'
  ]">
    <div :class="[
      'xs:leading-5 sm:leading-6',
      props.isFixed && 'container mx-auto px-2',
      !props.isFixed && 'p-2'
    ]">
      <component :is="formatTitleAsVNode(`${rfcId.type}${rfcId.number}`)" />
      <div
        v-if="pillText.length > 0"
        class="text-gray-400"
      >
        <span
          v-for="(pillTextItem, pillTextItemIndex) in pillText"
          :key="pillTextItemIndex"
        >
          {{ pillTextItem }}
        </span>
      </div>
      <div
        v-if="props.rfc.obsoleted_by && props.rfc.obsoleted_by.length > 0"
        class="text-red-400"
      >
        Obsoleted by
        <ul class="inline">
          <li
            v-for="(obsoletedByItem, obsoletedByItemIndex) in props.rfc
              .obsoleted_by"
            :key="obsoletedByItemIndex"
            class="inline"
          >
            <A :href="infoRfcPathBuilder(`RFC${obsoletedByItem.number}`)">
              <component :is="formatTitleAsVNode(`RFC${obsoletedByItem.number}`)" />
              {{ obsoletedByItem.title }}
            </A>
          </li>
        </ul>
      </div>
    </div>
    <slot />
  </div>
</template>

<script setup lang="ts">
import {
  formatTitleAsVNode,
  parseRFCId,
  type RfcCommon,
  getRfcPillText
} from '~/utilities/rfc'
import { infoRfcPathBuilder } from '~/utilities/url'

type Props = {
  rfc: RfcCommon
  isFixed: boolean
}

const props = defineProps<Props>()

const rfcId = computed(() => parseRFCId(`RFC${props.rfc.number}`))

const pillText = computed(() => getRfcPillText(props.rfc))
</script>
