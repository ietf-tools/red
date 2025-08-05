<template>
  <label class="text-base flex flex-row items-center">
    <span class="text-blue-900 dark:text-slate-300 mr-2">Sort by</span>
    <ais-sort-by
      :items="[
        {
          value: 'docs',
          label: 'Relevancy'
        },
        {
          value: 'docs/sort/rfcNumber:asc',
          label: 'RFC no. (Lowest first)'
        },
        {
          value: 'docs/sort/rfcNumber:desc',
          label: 'RFC no. (Highest first)'
        },
        {
          value: 'docs/sort/publicationDate:asc',
          label: 'Publication date (Oldest first)'
        },
        {
          value: 'docs/sort/publicationDate:desc',
          label: 'Publication date (Newest first)'
        }
      ]"
    >
      <template #default="{ items, currentRefinement, refine }">
        <SelectNeue
          :model-value="currentRefinement"
          @change="
            (event: Event) => {
              const select = event.target
              if (isSelectElement(select)) {
                refine(select.value)
              }
            }
          "
        >
          <option
            v-for="item of items"
            :key="item.value"
            :value="item.value"
            class="bg-white dark:bg-black"
          >
            {{ item.label }}
          </option>
        </SelectNeue>
      </template>
    </ais-sort-by>
  </label>
</template>

<script setup lang="ts">
import { AisSortBy } from 'vue-instantsearch/vue3/es'
import { isSelectElement } from '~/utilities/dom'
</script>
