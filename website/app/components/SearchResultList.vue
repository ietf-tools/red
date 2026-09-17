<template>
  <ul class="flex flex-col gap-4 computedHeadingWidth">
    <li v-for="rfc in list" :key="rfc.number" class="flex flex-col">
      <RFCCardSearchItem heading-level="3" :rfc="rfc" :density="searchStore.density" show-abstract show-tag-date />
    </li>
  </ul>
</template>

<script setup lang="ts">
import { watchDebounced } from '@vueuse/core'
import { calculateMaxHeadingCharWidth } from '~/utilities/rfc-title'
import type { TypeSenseSearchItem } from '../utilities/typesense'
import { typeSenseSearchItemToRFCCommon } from '~/utilities/rfc-converters'
import { useReefDocuments } from '~/utilities/reef-documents'

type Props = {
  items: TypeSenseSearchItem[]
}

const props = defineProps<Props>()

const list = computed(() =>
  props.items.map((typesenseSearchItem) => typeSenseSearchItemToRFCCommon(typesenseSearchItem))
)

// The whole page of results in one call, and only for the results this reader's answers aren't
// already held for — moving to page 2, or refining a query that keeps some of the same RFCs, asks
// only about what's new. Declared here rather than in the cards because a card that loaded its own
// would make one request per result. This reader's own state only: the public numbers beside it
// come from the search index, carried on each RFC as reefStats.
useReefDocuments(() => list.value.map((rfc) => rfc.number))

const maxHeadingWidth = ref(calculateMaxHeadingCharWidth(list.value))

watchDebounced(
  () => list,
  () => {
    maxHeadingWidth.value = calculateMaxHeadingCharWidth(list.value)
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
