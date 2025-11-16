<template>
  <ul class="flex flex-col gap-4 computedHeadingWidth">
    <li
      v-for="rfc in rfcs"
      :key="rfc.number"
      class="flex flex-col"
    >
      <RFCCardSearchItem
        heading-level="3"
        :rfc="rfc"
        :density="searchStore.density"
        show-abstract
        show-tag-date
      />
    </li>
  </ul>
</template>

<script setup lang="ts">
import { watchDebounced } from '@vueuse/core'
import { formatTitleAsVNode, formatSubseriesAsVNode, hasSubseries } from '~/utilities/rfc-title'
import type { TypeSenseSearchItem } from '../utilities/typesense'
import { getVNodeText } from '~/utilities/vue'
import { typeSenseSearchItemToRFCCommon } from '~/utilities/rfc-converters'
import type { RfcCommon } from '~/utilities/rfc-validators'

type Props = {
  items: TypeSenseSearchItem[]
}

const props = defineProps<Props>()

const rfcs = computed(() =>
  props.items.map(
    typesenseSearchItem => typeSenseSearchItemToRFCCommon(typesenseSearchItem)
  )
)

const calculateHeadingCharWidth = (rfc: RfcCommon): number => {
  const rfcHasSubseries = hasSubseries(rfc)
  const rfcTitle = getVNodeText(formatTitleAsVNode(`rfc${rfc.number}`, rfcHasSubseries))
  const rfcSubseries = getVNodeText(formatSubseriesAsVNode(rfc, false))
  const headingText = `${rfcTitle}${rfcHasSubseries ? ' ' : ''}${rfcSubseries}`
  return headingText.length
}

const MINIMUM_HEADING_CHAR_WIDTH = 7

const calculateMaxHeadingWidth = (rfcs: RfcCommon[]): number =>
  Math.max(...rfcs.map(rfc => calculateHeadingCharWidth(rfc)), MINIMUM_HEADING_CHAR_WIDTH)

const maxHeadingWidth = ref(calculateMaxHeadingWidth(rfcs.value))

watchDebounced(() => rfcs, () => {
  maxHeadingWidth.value = calculateMaxHeadingWidth(rfcs.value)
  console.log("recomputing max width", maxHeadingWidth.value)
}, {
  debounce: 200,
  maxWait: 400,
  immediate: true,
  deep: true
})

const searchStore = useSearchStore()
</script>

<style global>
.computedHeadingWidth {
  --computed-heading-char-length: v-bind(maxHeadingWidth)
}
</style>