<template>
  <div class="min-h-[100vh]">
    <NuxtLayout name="default" has-sub-header>
      <template #subheader>
        <IndexSubheader />
      </template>
      <div class="container mx-auto pl-5 pr-3">
        <div class="md:mx-2 flex lg:flex-row lg:items-center justify-between">
          <Heading level="2" :id="LATEST_RFCS_HEADING_DOM_ID" has-icon class="text-left mt-6"> Latest RFCs </Heading>
          <p class="hidden mt-8 lg:block text-base text-grey-800 pl-5">
            Looking for works in progress? Go to
            <Anchor :href="datatrackerUrlOrigin" class="text-blue-300 dark:text-blue-100">
              datatracker.ietf.org
            </Anchor>
          </p>
        </div>

        <div v-if="homepageLatestStatus === 'error' && homepageLatestError">
          <Alert variant="warning" heading="Unable to load latest RFCs"> Please try again later. </Alert>
        </div>

        <ul
          v-if="homepageLatestStatus === 'success'"
          class="md:mx-2 grid grid-cols-1 mt-3 md:grid-cols-2 lg:grid-cols-3 gap-4"
          :data-timestamp-iso="homepageLatest?.timestampIso"
          :aria-describedby="LATEST_RFCS_HEADING_DOM_ID">
          <li v-for="rfc in homepageLatest?.homepageLatest" :key="rfc.number">
            <RFCCard heading-level="3" :rfc="rfc" :show-abstract="false" :show-tag-date="true" class="h-full" />
          </li>
        </ul>

        <Heading level="2" :id="LEARN_ABOUT_RFCS_HEADING_DOM_ID" has-icon class="md:mx-2 mt-6 mb-3">
          Learn about RFCs
        </Heading>
        <ul
          class="md:mx-2 grid grid-cols-1 mt-3 md:grid-cols-2 lg:grid-cols-4 gap-4"
          :aria-describedby="LEARN_ABOUT_RFCS_HEADING_DOM_ID">
          <li><MarkdownCard id="/series/rfc/" class="h-full" /></li>
          <li><MarkdownCard id="/series/rfc-tips/" class="h-full" /></li>
          <li><MarkdownCard id="/series/rfc-errata/" class="h-full" /></li>
          <li><MarkdownCard id="/about/rfc-editor/" class="h-full" /></li>
        </ul>

        <Heading level="2" :id="BROWSE_RFCS_HEADING_DOM_ID" has-icon class="md:mx-2 mt-6 mb-3"> Browse RFCs </Heading>
        <ul
          class="md:mx-2 grid grid-cols-1 mt-3 md:grid-cols-2 lg:grid-cols-4 gap-4"
          :aria-describedby="BROWSE_RFCS_HEADING_DOM_ID">
          <li>
            <Card
              :href="searchV2PathBuilder({ status: ['Internet Standard'] })"
              heading-level="3"
              class="h-full"
              has-cover-link>
              <template #headingTitle>Standards</template>
              <CardContent>
                <p class="text-base mt-2 text-blue-900 dark:text-white">Stable or mature protocols and services</p>
              </CardContent>
            </Card>
          </li>

          <li>
            <Card
              :href="searchV2PathBuilder({ status: ['Best Current Practice'] })"
              heading-level="3"
              class="h-full"
              has-cover-link>
              <template #headingTitle>Best Current Practices</template>
              <CardContent>
                <p class="text-base mt-2 text-blue-900 dark:text-white">
                  Common guidelines for policies, operations, or procedures
                </p>
              </CardContent>
            </Card>
          </li>

          <li><MarkdownCard id="/series/rfc-download/" class="h-full" /></li>

          <li>
            <Card :href="RFC_INDEX_PATH" heading-level="3" class="h-full" has-cover-link>
              <template #headingTitle>Browse all RFCs</template>
            </Card>
          </li>
        </ul>

        <Heading level="2" :id="START_PARTICIPATING_HEADING_DOM_ID" has-icon class="md:mx-2 mt-6 mb-3">
          Start Participating
        </Heading>
        <ul
          class="md:mx-2 grid grid-cols-1 mt-3 md:grid-cols-2 lg:grid-cols-4 gap-4"
          :aria-describedby="START_PARTICIPATING_HEADING_DOM_ID">
          <li>
            <Card :href="IETF_URL_ORIGIN" heading-level="3" class="h-full" has-cover-link>
              <template #headingTitle>Internet Engineering Task Force</template>
              <CardContent>
                <p class="text-base mt-2 text-blue-900 dark:text-white">
                  Protocol standards, best current practices, experimental, and informational documents
                </p>
              </CardContent>
            </Card>
          </li>

          <li>
            <Card :href="IRTF_URL_ORIGIN" heading-level="3" class="h-full" has-cover-link>
              <template #headingTitle>Internet Research Task Force</template>
              <CardContent>
                <p class="text-base mt-2 text-blue-900 dark:text-white">Research issues related to the Internet</p>
              </CardContent>
            </Card>
          </li>

          <li>
            <Card :href="IAB_URL_ORIGIN" heading-level="3" class="h-full" has-cover-link>
              <template #headingTitle>Internet Architecture Board</template>
              <CardContent>
                <p class="text-base mt-2 text-blue-900 dark:text-white">
                  Long-range technical direction for Internet development
                </p>
              </CardContent>
            </Card>
          </li>

          <li><MarkdownCard id="/authors/rfc-independent-submissions/" class="h-full" /></li>
        </ul>
      </div>
    </NuxtLayout>
  </div>
</template>

<script setup lang="ts">
import { useRfcEditorHead } from '~/utilities/head'
import { HomepageLatestSchema } from '~/utilities/rfc-validators'
import {
  IAB_URL_ORIGIN,
  IETF_URL_ORIGIN,
  IRTF_URL_ORIGIN,
  API_HOMEPAGE_LATEST_PATH,
  useDatatrackerUrlOrigin,
  usePublicSiteUrlOrigin,
  useApiV1UrlOrigin,
  RFC_INDEX_PATH,
  searchV2PathBuilder
} from '~/utilities/url'
import type { HomepageLatest } from '~/utilities/rfc-validators'

definePageMeta({
  layout: false
})

const datatrackerUrlOrigin = useDatatrackerUrlOrigin()
const publicSiteUrlOrigin = usePublicSiteUrlOrigin()
const apiV1UrlOrigin = useApiV1UrlOrigin()

const LATEST_RFCS_HEADING_DOM_ID = 'latest-rfcs-heading'
const LEARN_ABOUT_RFCS_HEADING_DOM_ID = 'learn-about-rfcs-heading'
const BROWSE_RFCS_HEADING_DOM_ID = 'browse-rfcs-heading'
const START_PARTICIPATING_HEADING_DOM_ID = 'start-participating-heading'

const {
  data: homepageLatestData,
  status: homepageLatestStatus,
  error: homepageLatestError
} = await useAsyncData(() => {
  const maybeHomepageLatest = $fetch(API_HOMEPAGE_LATEST_PATH, {
    method: 'GET',
    baseURL: import.meta.server ? apiV1UrlOrigin : undefined
  })
  if (typeof maybeHomepageLatest !== 'object') {
    console.log(
      "Unexpected response type. The server Content-Type may be misconfigured so $fetch() doesn't parse as JSON",
      typeof maybeHomepageLatest,
      maybeHomepageLatest
    )
    throw Error(`Unable to load homepage latest. See console for more.`)
  }
  return maybeHomepageLatest
})

const homepageLatest = computed((): HomepageLatest | undefined => {
  if (homepageLatestError.value) {
    console.error('Homepage latest loading problem', homepageLatestError.value)
    return undefined
  }
  const { data, error } = HomepageLatestSchema.safeParse(homepageLatestData.value)
  if (error) {
    console.error('Homepage latest parsing problem', error)
    return undefined
  }
  return data
})

useRfcEditorHead({
  title: '',
  canonicalPath: `${publicSiteUrlOrigin}/`,
  description:
    'The official home of RFCs. RFCs outline computer networking and Internet foundations, including Internet Standards and historical or informative content.',
  contentType: 'website'
})
</script>
