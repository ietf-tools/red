<template>
  <label>
    <span class="text-base font-bold text-blue-900 dark:text-slate-300 block mb-1">{{ props.label }}</span>
    <ais-menu-select
      :attribute="props.attribute"
      :limit="200"
      :class-names="{
        'ais-MenuSelect': 'w-full text-base bg-white border border-gray-400 hover:border-black dark:bg-black dark:border-white dark:hover:border-gray-300 dark:text-white px-1 rounded-xs shadow-sm scheme-light dark:scheme-dark',
        'ais-MenuSelect-select': 'w-full px-1 py-2'
      }"
    >
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

const props = defineProps<Props>()
</script>
