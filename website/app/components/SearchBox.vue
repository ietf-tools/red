<template>
  <form method="get" :action="SEARCH_PATH" class="flex flex-row pt-4 pb-4 md:pb-8" @submit.stop.prevent="handleSearch">
    <input id="search" v-model="searchQuery" type="search" name="q"
      class="min-w-[0px] w-full bg-white text-black dark:bg-black dark:text-white dark:border-white dark:border pl-4 md:pl-6 py-3"
      :placeholder="SEARCH_PLACEHOLDER" aria-label="Find an RFC (number, subseries, title, author, etc.)" />
    <button type="submit" name="search" class="bg-blue-200 px-2 flex items-center" aria-label="Submit search">
      <Icon name="fluent:search-12-filled" size="2em" />
    </button>
  </form>
</template>

<script setup lang="ts">
import { parseSeriesId } from '~/utilities/rfc'
import { SEARCH_PLACEHOLDER } from '~/utilities/search'
import { infoSeriesPathBuilder, SEARCH_PATH, searchPathBuilder } from '~/utilities/url'

const searchQuery = ref('')

const handleSearch = () => {
  const { value } = searchQuery
  const normalizedValue = value.trim()
  if (normalizedValue.match(/^[0-9]+$/)) {
    // if it's just a number assume they want to go to an RFC
    const rfcNumber = parseInt(normalizedValue, 10)
    if (rfcNumber > 0) {
      navigateTo(infoSeriesPathBuilder(`rfc${rfcNumber}`))
      return
    }
  }
  const seriesId = parseSeriesId(normalizedValue)
  if (seriesId) {
    navigateTo(infoSeriesPathBuilder(`${seriesId.type}${seriesId.number}`))
    return
  }

  const searchPath = searchPathBuilder({
    q: searchQuery.value
  })
  navigateTo(searchPath)
}
</script>
