<template>
  <ul class="flex flex-col gap-4 computedHeadingWidth">
    <li v-for="item in list" :key="item.rfc.number" class="flex flex-col">
      <RFCCardSearchItem
        heading-level="3"
        :rfc="item.rfc"
        :density="searchStore.density"
        show-abstract
        show-tag-date
        :reef-stats="reefStats" />
    </li>
  </ul>
</template>

<script setup lang="ts">
import { watchDebounced } from '@vueuse/core'
import { formatTitleAsVNode, formatSubseriesAsVNode, hasSubseries } from '~/utilities/rfc-title'
import type { TypeSenseSearchItem } from '../utilities/typesense'
import { getVNodeText } from '~/utilities/vue'
import { typeSenseSearchItemToRFCCommon } from '~/utilities/rfc-converters'
import type { ReefRFCStats, RfcCommon } from '~/utilities/rfc-validators'

type Props = {
  items: TypeSenseSearchItem[]
}

const props = defineProps<Props>()

const list = computed(() =>
  props.items.map((typesenseSearchItem) => {
    return {
      rfc: typeSenseSearchItemToRFCCommon(typesenseSearchItem),
      reefStats: reefStats.value?.[typesenseSearchItem.rfcNumber]
    }
  })
)

const calculateHeadingCharWidth = (rfc: RfcCommon): number => {
  const rfcHasSubseries = hasSubseries(rfc)
  const rfcTitle = getVNodeText(formatTitleAsVNode(`rfc${rfc.number}`, rfcHasSubseries))
  const rfcSubseries = getVNodeText(formatSubseriesAsVNode(rfc, false, false))
  const headingText = `${rfcTitle}${rfcHasSubseries ? ' ' : ''}${rfcSubseries}`
  return headingText.length
}

const MINIMUM_HEADING_CHAR_WIDTH = 7

const calculateMaxHeadingWidth = (rfcs: RfcCommon[]): number =>
  Math.max(...rfcs.map((rfc) => calculateHeadingCharWidth(rfc)), MINIMUM_HEADING_CHAR_WIDTH)

const maxHeadingWidth = ref(calculateMaxHeadingWidth(list.value?.map((item) => item.rfc)))

watchDebounced(
  () => list,
  () => {
    maxHeadingWidth.value = calculateMaxHeadingWidth(list.value?.map((item) => item.rfc))
    // console.log('recomputing max width', maxHeadingWidth.value)
  },
  {
    debounce: 200,
    maxWait: 400,
    immediate: true,
    deep: true
  }
)

const searchStore = useSearchStore()

const reefStats: Ref<Record<number, ReefRFCStats>> = computed(() => {
  return {}
})
</script>

<style global>
.computedHeadingWidth {
  --computed-heading-char-length: v-bind(maxHeadingWidth);
}
</style>
