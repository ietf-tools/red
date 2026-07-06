<template>
  <div v-html="noScriptHtml"></div>
  <form method="get" :action="SEARCH_PATH" class="flex flex-row pt-3 md:pb-3" @submit.stop.prevent="handleSearch">
    <input
      id="search"
      ref="search-input"
      :disabled="!isMounted"
      v-model="searchQuery"
      type="search"
      name="q"
      class="min-w-[0px] pl-4 md:pl-6 py-3 w-full text-black dark:text-white bg-white dark:bg-black border-1 border-black dark:border-white"
      :placeholder="SEARCH_PLACEHOLDER"
      aria-label="Find an RFC (number, subseries, title, author, etc.)"
      autocorrect="off"
      autocapitalize="off"
      spellcheck="false"
      autocomplete="off" />
    <button
      type="submit"
      name="search"
      :disabled="!isMounted"
      class="cursor-pointer bg-blue-200 px-2 flex items-center"
      aria-label="Submit search">
      <GraphicsSearch class="size-[2em]" />
    </button>
  </form>
  <div class="text-sm italic">
    <Anchor
      v-if="didYouMean"
      :href="infoSeriesPathBuilder(`${didYouMean.type}${didYouMean.number}`)"
      class="underline hover:text-blue-100 dark:text-blue-100">
      go directly to
      <SubseriesTitle :series="didYouMean" />
      ?
    </Anchor>
    {{ NONBREAKING_SPACE }}
  </div>
</template>

<script setup lang="ts">
import { watchDebounced } from '@vueuse/core'
import { parseSeriesId, type SeriesId } from '~/utilities/rfc'
import { SEARCH_PLACEHOLDER } from '~/utilities/search'
import { NONBREAKING_SPACE } from '~/utilities/strings'
import {
  apiRfcBucketDocumentPathBuilder,
  apiSubseriesPathBuilder,
  infoSeriesPathBuilder,
  SEARCH_PATH,
  searchPathBuilder
} from '~/utilities/url'
import SubseriesTitle from './SubseriesTitle.vue'
import {
  useFeatureFlags,
  watchInputForFeatureFlagExperiments,
  isFeatureFlagsModalVisibleKey
} from '~/utilities/feature-flags.js'

const isFeatureFlagsModalVisible = inject(isFeatureFlagsModalVisibleKey)

if (!isFeatureFlagsModalVisible) {
  throw Error(`Expected inject(isFeatureFlagsModalVisibleKey) to be available`)
}

const searchInputRef = useTemplateRef('search-input')

const searchQuery = ref(searchInputRef.value?.value ?? '')

const didYouMean = ref<SeriesId | undefined>()

const isMounted = ref(false)

onMounted(() => {
  isMounted.value = true
})

let abortController: AbortController | undefined = undefined

const featureFlags = useFeatureFlags()

watchInputForFeatureFlagExperiments({
  inputValueRef: searchQuery,
  isFeatureFlagsModalVisibleRef: isFeatureFlagsModalVisible
})

const checkSearchForSeriesId = async () => {
  const value = searchQuery.value

  if (!value || featureFlags.value.isDidYouMeanActive === false) {
    return
  }

  if (abortController) {
    abortController.abort()
  }

  didYouMean.value = undefined
  abortController = new AbortController()
  const signal = abortController.signal

  const normalizedValue = value.trim().replace(/\s/g, '')
  let seriesId = parseSeriesId(normalizedValue)

  if (
    // if it's just a number assume RFC number
    normalizedValue.match(/^[0-9]+$/)
  ) {
    const rfcNumber = parseInt(normalizedValue, 10)
    seriesId = {
      type: 'rfc',
      number: rfcNumber
    }
  }

  if (seriesId && seriesId.number > 0) {
    if (seriesId.type === 'rfc') {
      const rfcDataPath = apiRfcBucketDocumentPathBuilder(seriesId.number)
      try {
        const response = await fetch(rfcDataPath, {
          method: 'GET',
          signal
        })
        if (response.ok) {
          didYouMean.value = seriesId
          return
        }
      } catch (e: unknown) {
        console.info(
          `[Homepage search] RFC ${seriesId.number} doesn't exist so using search`,
          rfcDataPath,
          normalizedValue,
          value,
          e
        )
      }
    } else {
      const subseriesPath = apiSubseriesPathBuilder(seriesId.type, seriesId.number)
      try {
        const response = await fetch(subseriesPath, {
          method: 'GET',
          signal
        })
        if (response.ok) {
          didYouMean.value = seriesId
          return
        }
      } catch (e: unknown) {
        console.info(
          `[Homepage search] ${seriesId.type} ${seriesId.number} doesn't exist so using search`,
          subseriesPath,
          normalizedValue,
          value,
          e
        )
      }
    }
  }

  didYouMean.value = undefined
}

const noScriptHtml = computed(() => {
  return `<noscript data-nosnippet><div style="margin-top:1rem; background-color: #ffc9c9; color: #9f0712; padding: 7px; text-size: .9rem;">Your browser has JavaScript disabled. The following search won't work. Use <a href="${SEARCH_PATH}"><b>this search instead</b></a>. Please enable JavaScript for many more search features.</div></noscript>`
})

/**
 * If a user types something that looks like an RFC number or seriesId then offer a link to go directly to an RFC
 *
 */
watchDebounced(() => searchQuery.value, checkSearchForSeriesId, {
  debounce: 200,
  maxWait: 400,
  immediate: false,
  deep: true
})

const handleSearch = async () => {
  const { value } = searchQuery
  const searchPath = searchPathBuilder({
    q: value
  })
  navigateTo(searchPath)
}
</script>
