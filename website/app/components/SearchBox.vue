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
import { apiRfcBucketDocumentPathBuilder, apiSubseriesPathBuilder, infoSeriesPathBuilder, SEARCH_PATH, searchPathBuilder, useApiV1UrlOrigin } from '~/utilities/url'

const apiV1UrlOrigin = useApiV1UrlOrigin()

const searchQuery = ref('')

const handleSearch = async () => {
  const { value } = searchQuery
  const normalizedValue = value.trim().replace(/\s/g, '')
  if (normalizedValue.match(/^[0-9]+$/)) {
    // if it's just a number assume they want to go to an RFC
    const rfcNumber = parseInt(normalizedValue, 10)
    if (rfcNumber > 0) {
      const rfcDataPath = apiRfcBucketDocumentPathBuilder(rfcNumber)
      try {
        const maybeRfcBucketDocument = await $fetch(rfcDataPath, {
          method: 'GET',
          baseURL: import.meta.server ? apiV1UrlOrigin : undefined,
        })
        if (maybeRfcBucketDocument) {
          await navigateTo(infoSeriesPathBuilder(`rfc${rfcNumber}`))
          return
        }
      } catch (e: unknown) {
        console.info(`[Homepage search] RFC ${rfcNumber} doesn't exist so using search`, rfcDataPath, normalizedValue, value, e)
      }
    }
  }
  const seriesId = parseSeriesId(normalizedValue)
  if (seriesId) {
    const subseriesPath = apiSubseriesPathBuilder(seriesId.type, seriesId.number)
    try {
      const maybeSubseriesDocument = await $fetch(subseriesPath, {
        method: 'GET',
        baseURL: import.meta.server ? apiV1UrlOrigin : undefined,
      })
      if (maybeSubseriesDocument) {
        await navigateTo(infoSeriesPathBuilder(`${seriesId.type}${seriesId.number}`))
        return
      }
    } catch (e: unknown) {
      console.info(`[Homepage search] ${seriesId.type} ${seriesId.number} doesn't exist so using search`, subseriesPath, normalizedValue, value, e)
    }
  }

  const searchPath = searchPathBuilder({
    q: searchQuery.value
  })
  navigateTo(searchPath)
}
</script>
