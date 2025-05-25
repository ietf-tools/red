<template>
  <ais-refinement-list attribute="stdlevelname" :sort-by="['name:asc']">
    <template #default="{ items, refine }">
      <fieldset>
        <legend class="text-base font-bold mb-2">Status</legend>
        <ul class="grid-cols-1 2xl:grid-cols-2 grid gap-1">
          <li
            v-for="item in items"
            :key="item.value"
          >
            <label class="text-base cursor-pointer">
              <input
                class="mr-1 size-6 align-middle scheme-light dark:scheme-dark"
                type="checkbox"
                :value="item.value"
                :checked="item.isRefined"
                @click="refine(item.value)"
              />
              {{ item.label }}
            </label>
          </li>
        </ul>
      </fieldset>
    </template>
  </ais-refinement-list>
</template>

<script setup>
import { AisRefinementList } from 'vue-instantsearch/vue3/es'
</script>
