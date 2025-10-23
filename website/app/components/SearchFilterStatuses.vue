<template>
  <ais-refinement-list attribute="status.name" :sort-by="reorderItems">
    <template #default="{ items, refine }">
      <fieldset>
        <legend class="text-base font-bold text-blue-900 dark:text-slate-300 mb-2">Status</legend>
        <ul class="grid grid-cols-1 2xl:grid-cols-2 gap-2">
          <li v-for="item in items" :key="item.value">
            <label class="text-base cursor-pointer">
              <input class="mr-1 size-6 align-middle shadow-sm scheme-light dark:scheme-dark" type="checkbox"
                :value="item.value" :checked="item.isRefined" @click="refine(item.value)" />
              {{ item.label }}
            </label>
          </li>
        </ul>
      </fieldset>
    </template>
  </ais-refinement-list>
</template>

<script setup lang="ts">
import { AisRefinementList } from 'vue-instantsearch/vue3/es'
import type { TypeSenseSearchItem } from '~/utilities/typesense'

type StatusName = TypeSenseSearchItem["status"]["name"]

const predefinedOrder: StatusName[] = [
  'Internet Standard',
  'Proposed Standard',
  'Unknown',
  'Best Current Practice',
  'Experimental',
  'Historic',
  'Informational',
  'Not Issued',
]

function reorderItems(a: TypeSenseSearchItem['status'], b: TypeSenseSearchItem['status']) {
  return predefinedOrder.indexOf(a.name) - predefinedOrder.indexOf(b.name)
}
</script>
