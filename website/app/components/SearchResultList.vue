<template>
  <ul class="flex flex-col gap-4 computedHeadingWidth">
    <li v-for="item in props.items" :key="item.id" class="flex flex-col">
      <RFCCardTypeSenseItem heading-level="3" :type-sense-search-item="item" :density="searchStore.density"
        show-abstract show-tag-date />
    </li>
  </ul>
</template>

<script setup lang="ts">
import { isTypesenseSubseriesWithValues, type TypeSenseSearchItem } from '../utilities/typesense'
import RFCCardTypeSenseItem from '~/components/RFCCardTypeSenseItem.vue'

type Props = {
  items: TypeSenseSearchItem[]
}

const props = defineProps<Props>()

const calculateHeadingCharWidth = (item: TypeSenseSearchItem): number => {
  let chars = `RFC ${item.rfcNumber}`
  if (isTypesenseSubseriesWithValues(item.subseries)) {
    const subseries = item.subseries
    chars += `: ${subseries.acronym} ${subseries.number}`
  }
  return chars.length
}

const calculateMaxHeadingWidth = (items: TypeSenseSearchItem[]): number => {
  return Math.max(...items.map(item => calculateHeadingCharWidth(item)))
}

const maxHeadingWidth = ref(calculateMaxHeadingWidth(props.items))

watch(() => props.items, () => {
  maxHeadingWidth.value = calculateMaxHeadingWidth(props.items)
  console.log("recomputing max width", maxHeadingWidth.value)
}, {
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