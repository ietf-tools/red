<template>
  <ul class="flex flex-col gap-4 computedHeadingWidth">
    <li v-for="item in list" :key="item.rfc.number" class="flex flex-col">
      <RFCCardSearchItem heading-level="3" :rfc="item.rfc" :density="searchStore.density" show-abstract show-tag-date />
    </li>
  </ul>
</template>

<script setup lang="ts">
import { watchDebounced } from '@vueuse/core'
import { formatTitleAsVNode, formatSubseriesAsVNode, hasSubseries } from '~/utilities/rfc-title'
import type { TypeSenseSearchItem } from '../utilities/typesense'
import { getVNodeText } from '~/utilities/vue'
import { typeSenseSearchItemToRFCCommon } from '~/utilities/rfc-converters'
import { useReefRfcs } from '~/utilities/reef-documents'
import type { RfcCommon } from '~/utilities/rfc-validators'

type Props = {
  items: TypeSenseSearchItem[]
}

const props = defineProps<Props>()

const list = computed(() =>
  props.items.map((typesenseSearchItem) => {
    return {
      rfc: typeSenseSearchItemToRFCCommon(typesenseSearchItem)
    }
  })
)

// The whole page of results in one call, and only for the results this reader's answers aren't
// already held for — moving to page 2, or refining a query that keeps some of the same RFCs, asks
// only about what's new. Declared here rather than in the cards because a card that loaded its own
// would make one request per result.
useReefRfcs(() => list.value.map(({ rfc }) => rfc))

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
</script>

<style global>
.computedHeadingWidth {
  --computed-heading-char-length: v-bind(maxHeadingWidth);
}
</style>
