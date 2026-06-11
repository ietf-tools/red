<template>
  <label>
    <span class="text-base font-semibold text-blue-900 dark:text-slate-300 block mb-1">{{ props.label }}</span>
    <ais-menu-select
      :id="props.attribute"
      :attribute="props.attribute"
      :limit="200"
      :class-names="{
        'ais-MenuSelect':
          'w-full text-base border border-gray-400 hover:border-black dark:bg-black dark:border-white dark:hover:border-gray-300 px-1 rounded-xs shadow-sm',
        'ais-MenuSelect-select': 'bg-white text-black dark:bg-black dark:text-white w-full px-1 py-2'
      }"
      :transform-items="transformItems">
      <template #defaultOption>Any</template>
    </ais-menu-select>
  </label>
</template>

<script setup lang="ts">
import { AisMenuSelect } from 'vue-instantsearch/vue3/es'
import type { VueStyleClass } from '~/utilities/vue'

type Props = {
  attribute: string
  label: string
  class?: VueStyleClass
}

type Items = { label: string }[]

const transformItems = (items: Items) => {
  return items.map((item) => ({
    ...item,
    label: formatLabel(item.label)
  }))
}

const formatLabel = (label: string) => {
  if (props.attribute === 'stream.name') {
    switch (label.toLowerCase()) {
      case 'ise':
      case 'independent':
      case 'independent submission':
        return 'Independent Submission'
    }
  }
  return label
}

const props = defineProps<Props>()
</script>
