<template>
  <label>
    <span v-if="props.label" class="text-base font-bold block mb-1">{{ props.label }}</span>
    <ais-toggle-refinement
      v-for="attr of props.attributes"
      :key="attr.attribute"
      :attribute="attr.attribute"
      :label="attr.label"
      :on="false"
      >
      <template #default="{ value, refine }">
        <label class="text-base cursor-pointer flex items-center">
          <input
            class="mr-1 size-5 align-middle shadow-sm scheme-light dark:scheme-dark"
            type="checkbox"
            :value="value.name"
            :checked="value.isRefined"
            @click="refine(value)"
          />
          <span class="ml-1">Hide <span class="text-red-800 dark:text-red-400">{{ attr.label }}</span></span>
          <Icon v-if="value.isRefined" name="mdi:hide" class="text-gray-400 ml-2" size="1.2em" />
        </label>
      </template>
    </ais-toggle-refinement>
  </label>
</template>

<script setup lang="ts">
import { AisToggleRefinement } from 'vue-instantsearch/vue3/es'
import type { VueStyleClass } from '~/utilities/vue'

type DisplayAttribute = {
  attribute: string
  label: string
}

type Props = {
  label?: string
  attributes: DisplayAttribute[]
  class?: VueStyleClass
}

const props = defineProps<Props>()
</script>