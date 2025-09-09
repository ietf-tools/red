<template>
  <div class="min-h-[100vh]">
    <NuxtLayout name="default">
      <template #subheader>
        <IndexSubheader />
      </template>
      <div class="container mx-auto">
        <div class="md:mx-2 flex flex-col-reverse lg:flex-row lg:items-center justify-between">
          <Heading
            level="2"
            has-icon
            class="text-left mt-10 mb-4 pl-5 md:pl-0"
          >
            Latest RFCs
          </Heading>
          <p class="hidden mt-8 lg:block text-base text-grey-800 pl-5">
            Looking for works in progress? Go to
            <A
              :href="DATATRACKER_URL"
              class="text-blue-300 dark:text-blue-100"
            >
              datatracker.ietf.org
            </A>
          </p>
        </div>

        <div v-if="searchStatus === 'error' && searchError">
          <Alert
            variant="warning"
            heading="Unable to load latest RFCs"
          >
            {{ searchError.statusMessage }}
          </Alert>
        </div>

        <div v-if="searchStatus === 'success' && topSearchResults?.length === 0">
          <Alert
            variant="warning"
            heading="Unable to load latest RFCs"
          >
            Try again later (API error)
          </Alert>
        </div>

        <div
          v-if="searchStatus === 'success'"
          class="md:mx-2 grid grid-cols-1 mt-3 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          <RFCCard
            v-for="searchResult in topSearchResults"
            :key="searchResult.number"
            heading-level="3"
            :rfc="searchResult"
            :show-abstract="false"
            :show-tag-date="true"
          />
        </div>

        <Heading
          level="2"
          has-icon
          class="md:mx-2 mt-10 mb-5 pl-5 md:p-0"
        >
          Learn about RFCs
        </Heading>
        <div class="md:mx-2 grid grid-cols-1 mt-3 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MarkdownCard id="/series/rfc/" />
          <MarkdownCard id="/series/rfc-tips/" />
          <MarkdownCard id="/series/rfc-errata/" />
          <MarkdownCard id="/about/rfc-editor/" />
        </div>

        <Heading
          level="2"
          has-icon
          class="md:mx-2 mt-10 mb-5 pl-5 md:p-0"
        >
          Browse RFCs
        </Heading>
        <div class="md:mx-2 grid grid-cols-1 mt-3 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card
            :href="searchPathBuilder({ status: ['Internet Standard'] })"
            heading-level="3"
            has-cover-link
          >
            <template #headingTitle>Standards</template>
            <p class="text-base mt-2 text-blue-900 dark:text-white">
              Stable or mature protocols and services
            </p>
          </Card>

          <Card
            :href="searchPathBuilder({ status: ['Best Current Practice'] })"
            heading-level="3"
            has-cover-link
          >
            <template #headingTitle>Best Current Practices</template>
            <p class="text-base mt-2 text-blue-900 dark:text-white">
              Common guidelines for policies, operations, or procedures
            </p>
          </Card>

          <MarkdownCard id="/series/rfc-download/" />
        </div>

        <Heading
          level="2"
          has-icon
          class="md:mx-2 pl-5 mt-10 mb-5 md:p-0"
        >
          Start Participating
        </Heading>
        <div class="md:mx-2 grid grid-cols-1 mt-3 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card
            :href="IETF_URL"
            heading-level="3"
            has-cover-link
          >
            <template #headingTitle>Internet Engineering Task Force</template>
            <p class="text-base mt-2 text-blue-900 dark:text-white">
              Protocol standards, best current practices, experimental, and
              informational documents
            </p>
          </Card>

          <Card
            :href="IRTF_URL"
            heading-level="3"
            has-cover-link
          >
            <template #headingTitle>Internet Research Task Force</template>
            <p class="text-base mt-2 text-blue-900 dark:text-white">
              Research issues related to the Internet
            </p>
          </Card>

          <Card
            :href="IAB_URL"
            heading-level="3"
            has-cover-link
          >
            <template #headingTitle>Internet Architecture Board</template>
            <p class="text-base mt-2 text-blue-900 dark:text-white">
              Long-range technical direction for Internet development
            </p>
          </Card>

          <MarkdownCard id="/authors/rfc-independent-submissions/" />
        </div>
      </div>
    </NuxtLayout>
  </div>
</template>

<script setup lang="ts">
import { useRfcEditorHead } from '~/utilities/head'
import { rfcMetadataToRfcCommon } from '~/utilities/rfc-converters'
import {
  DATATRACKER_URL,
  IAB_URL,
  IETF_URL,
  IRTF_URL,
  PUBLIC_SITE,
  SEARCH_API_PATH,
  searchPathBuilder
} from '~/utilities/url'

definePageMeta({
  layout: false
})

const {
  data: searchResponse,
  status: searchStatus,
  error: searchError
} = await useAsyncData(() => $fetch(SEARCH_API_PATH))

const topSearchResults = computed(() => {
  const allSearchResults = searchResponse.value?.results
  return Array.isArray(allSearchResults) ?
    allSearchResults.slice(0, 3).map(rfcMetadataToRfcCommon)
    : []
})

useRfcEditorHead({
  title: '',
  canonicalUrl: PUBLIC_SITE,
  description:
    'The official home of RFCs. RFCs outline computer networking and Internet foundations, including Internet Standards and historical or informative content.',
  contentType: 'website'
})
</script>
