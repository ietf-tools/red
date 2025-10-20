<template>
  <div class="min-h-[100vh]">
    <NuxtLayout name="default">
      <template #subheader>
        <IndexSubheader />
      </template>
      <div class="container mx-auto">
        <div class="md:mx-2 flex flex-col-reverse lg:flex-row lg:items-center justify-between">
          <Heading level="2" has-icon class="text-left mt-10 mb-4 pl-5 md:pl-0">
            Latest RFCs
          </Heading>
          <p class="hidden mt-8 lg:block text-base text-grey-800 pl-5">
            Looking for works in progress? Go to
            <A :href="DATATRACKER_URL_ORIGIN" class="text-blue-300 dark:text-blue-100">
              datatracker.ietf.org
            </A>
          </p>
        </div>

        <div v-if="homepageLatestStatus === 'error' && homepageLatestError">
          <Alert variant="warning" heading="Unable to load latest RFCs">
            {{ homepageLatestError.statusMessage }}
          </Alert>
        </div>

        <div v-if="homepageLatestStatus === 'success'"
          class="md:mx-2 grid grid-cols-1 mt-3 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <RFCCard v-for="rfc in homepageLatest" :key="rfc.number" heading-level="3" :rfc="rfc" :show-abstract="false"
            :show-tag-date="true" />
        </div>

        <Heading level="2" has-icon class="md:mx-2 mt-10 mb-5 pl-5 md:p-0">
          Learn about RFCs
        </Heading>
        <div class="md:mx-2 grid grid-cols-1 mt-3 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MarkdownCard id="/series/rfc/" />
          <MarkdownCard id="/series/rfc-tips/" />
          <MarkdownCard id="/series/rfc-errata/" />
          <MarkdownCard id="/about/rfc-editor/" />
        </div>

        <Heading level="2" has-icon class="md:mx-2 mt-10 mb-5 pl-5 md:p-0">
          Browse RFCs
        </Heading>
        <div class="md:mx-2 grid grid-cols-1 mt-3 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card :href="searchPathBuilder({ status: ['Internet Standard'] })" heading-level="3" has-cover-link>
            <template #headingTitle>Standards</template>
            <p class="text-base mt-2 text-blue-900 dark:text-white">
              Stable or mature protocols and services
            </p>
          </Card>

          <Card :href="searchPathBuilder({ status: ['Best Current Practice'] })" heading-level="3" has-cover-link>
            <template #headingTitle>Best Current Practices</template>
            <p class="text-base mt-2 text-blue-900 dark:text-white">
              Common guidelines for policies, operations, or procedures
            </p>
          </Card>

          <MarkdownCard id="/series/rfc-download/" />
        </div>

        <Heading level="2" has-icon class="md:mx-2 pl-5 mt-10 mb-5 md:p-0">
          Start Participating
        </Heading>
        <div class="md:mx-2 grid grid-cols-1 mt-3 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card :href="IETF_URL_ORIGIN" heading-level="3" has-cover-link>
            <template #headingTitle>Internet Engineering Task Force</template>
            <p class="text-base mt-2 text-blue-900 dark:text-white">
              Protocol standards, best current practices, experimental, and
              informational documents
            </p>
          </Card>

          <Card :href="IRTF_URL_ORIGIN" heading-level="3" has-cover-link>
            <template #headingTitle>Internet Research Task Force</template>
            <p class="text-base mt-2 text-blue-900 dark:text-white">
              Research issues related to the Internet
            </p>
          </Card>

          <Card :href="IAB_URL_ORIGIN" heading-level="3" has-cover-link>
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
import { HomepageLatestSchema } from '~/utilities/rfc-validators'
import {
  DATATRACKER_URL_ORIGIN,
  IAB_URL_ORIGIN,
  IETF_URL_ORIGIN,
  IRTF_URL_ORIGIN,
  PUBLIC_SITE_URL_ORIGIN,
  API_HOMEPAGE_LATEST_PATH,
  searchPathBuilder
} from '~/utilities/url'
import type { RfcCommon } from '~/utilities/rfc-validators'

definePageMeta({
  layout: false
})

const {
  data: homepageLatestData,
  status: homepageLatestStatus,
  error: homepageLatestError
} = await useAsyncData(() => $fetch(API_HOMEPAGE_LATEST_PATH))

const homepageLatest = computed((): RfcCommon[] => {
  const { data, error } = HomepageLatestSchema.safeParse(homepageLatestData.value)
  if (error) {
    console.error(error)
    return []
  }
  return data.homepageLatest
})

useRfcEditorHead({
  title: '',
  canonicalUrl: PUBLIC_SITE_URL_ORIGIN,
  description:
    'The official home of RFCs. RFCs outline computer networking and Internet foundations, including Internet Standards and historical or informative content.',
  contentType: 'website'
})
</script>