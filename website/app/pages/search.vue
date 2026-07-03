<template>
  <div class="min-h-[100vh]">
    <RfcEditorSearch v-if="hasSearchV2" />
    <AisSearch v-else />
  </div>
</template>

<script setup lang="ts">
import AisSearch from '~/components/ais-search.vue'
import RfcEditorSearch from '~/components/RfcEditorSearch.vue'
import { useFeatureFlags } from '~/utilities/feature-flags'
import { useRfcEditorHead } from '~/utilities/head'
import { searchPathBuilder } from '~/utilities/url'

definePageMeta({
  layout: false
})

// The canonical path should not include the various search queries and filters etc.
// For the purposes of search engines recommended website entry point (which is all
// a canonical URL is) it should be a default search.
const canonicalPath = searchPathBuilder({})

const featureFlags = useFeatureFlags()

const hasSearchV2 = computed(() => featureFlags.value.searchV2 ?? false)

useRfcEditorHead({
  title: 'Search',
  canonicalPath,
  description: 'Search RFCs by number, title, subseries, author, etc.',
  contentType: 'website'
})
</script>
