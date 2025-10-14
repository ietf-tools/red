<template>
  <form
    method="get"
    :action="SEARCH_PATH"
    class="flex flex-row pt-4 pb-4 md:pb-8"
    @submit.stop.prevent="handleSearch"
  >
    <input
      v-model="searchQuery"
      id="search"
      type="search"
      name="q"
      class="min-w-[0px] w-full bg-white text-black dark:bg-black dark:text-white dark:border-white dark:border pl-4 md:pl-6 py-3"
      :placeholder="responsiveModeStore.responsiveMode === 'Desktop' ?
        'Find an RFC (number, subseries, title, author, etc.)'
        : 'Find an RFC'
        "
      aria-label="Find an RFC (number, subseries, title, author, etc.)"
    />
    <button
      type="submit"
      name="search"
      class="bg-blue-200 px-2 flex items-center"
    >
      <Icon
        name="fluent:search-12-filled"
        size="2em"
      />
    </button>
  </form>
</template>

<script setup lang="ts">
import { SEARCH_PATH, searchPathBuilder } from '~/utilities/url'

const responsiveModeStore = useResponsiveModeStore()

const searchQuery = ref('')

const handleSearch = () => {
  const searchPath = searchPathBuilder({
    q: searchQuery.value
  })
  navigateTo(searchPath)
}
</script>
