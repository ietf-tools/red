<template>
  <label class="text-base cursor-pointer flex items-center">
    <input
      v-model="searchStore.searchContents"
      class="mr-1 size-5 scheme-light dark:scheme-dark"
      type="checkbox"
    />
    <span>Search in RFC contents</span>
  </label>
</template>

<script setup lang="ts">
const searchStore = useSearchStore()
</script>
