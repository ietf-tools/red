<template>
  <div class="min-h-[100vh]">
    <RFCSearch />
  </div>
</template>

<script setup lang="ts">
import RFCSearch from '~/components/RFCSearch.vue'
import { useRfcEditorHead } from '~/utilities/head'
import { searchV2PathBuilder } from '~/utilities/url'

definePageMeta({
  layout: false
})

// The canonical path should not include the various search queries and filters etc.
// For the purposes of search engines recommended website entry point (which is all
// a canonical URL is) it should be a default search.
const canonicalPath = searchV2PathBuilder({})

useRfcEditorHead({
  title: 'Search',
  canonicalPath,
  description: 'Search RFCs by number, title, subseries, author, etc.',
  contentType: 'website'
})
</script>
