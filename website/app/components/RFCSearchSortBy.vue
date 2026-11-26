<template>
  <SortBy :items="items" label="Sort by" :class-names="props.classNames" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { SortBy, useSearchContext, type ClassNames } from '~/components/searchv2'
import { sortItemsForStatuses } from '~/utilities/searchv2-sort'

type Props = {
  classNames?: ClassNames
}

const props = defineProps<Props>()

const context = useSearchContext()

const items = computed(() => sortItemsForStatuses(context.uiState.value.refinements?.['status.name'] ?? []))
</script>
