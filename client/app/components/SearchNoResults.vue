<template>
  <div
    class="rounded-xs bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-200 flex flex-col items-center justify-center px-3 py-5">
    <Icon name="radix-icons:value-none" size="5em" class="text-gray-300" />
    <span class="mt-3">No RFCs match your search query and active filters.</span>
    <ais-refinement-list attribute="flags.obsoleted">
      <template #default="{ items, refine }">
        <div v-for="(item, index) in items" :key="index" class="mt-3 text-center leading-7">
          Didn't find what you were looking for?<br />
          The <b>hide obsoleted</b> filter is active which may hide results.<br />
          <button type="button"
            class="mt-1 border-1 px-2 py-1 border-black dark:border-white cursor-pointer hover:bg-gray-300 focus:bg-gray-300 dark:hover:bg-gray-700 dark:focus:bg-gray-700"
            @click="refine(item.value)">
            Show obsoleted
          </button>
        </div>
      </template>
    </ais-refinement-list>
  </div>
</template>

<script setup lang="ts">
import { AisRefinementList } from 'vue-instantsearch/vue3/es'
</script>