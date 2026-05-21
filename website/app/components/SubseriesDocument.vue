<template>
  <BodyLayoutDocument>
    <template #sidebar>
      <div v-if="subseriesDocument" class="lg:min-w-[300px]">
        <p v-if="subseriesDocument.type === 'bcp'">
          BCPs are stable identifiers for Best Current Practices. A BCP may consist of a single RFC or a group of RFCs
          related to a specific IETF process or recommended guidelines.
        </p>
        <p v-else-if="subseriesDocument.type === 'std'">
          STDs are stable identifiers for "Internet Standards." An STD may consist of a single RFC or a group of RFCs
          related to a specific protocol.
        </p>
        <p v-else-if="subseriesDocument.type === 'fyi'">
          FYIs are stable identifiers for a series of "For Your Information" documents. An FYI consists of a single RFC
          on general interest topics relating to the Internet. The FYI subseries was retired in 2011.
        </p>
      </div>
    </template>
    <template v-if="subseriesDocumentError">
      <div class="container mx-auto">
        <Alert level="1" variant="warning" heading="Error">
          {{ subseriesDocumentError }}
        </Alert>
      </div>
    </template>

    <div class="min-h-screen">
      <div v-if="subseriesDocument" class="mt-3 flex flex-col gap-4">
        <RFCCard v-for="rfc in subseriesDocument.contents" :key="rfc.number" :rfc="rfc" heading-level="3"
          :show-abstract="true" />
      </div>
    </div>
  </BodyLayoutDocument>
</template>

<script setup lang="ts">
import { DateTime } from 'luxon'
import { SubseriesCommonSchema } from '~/utilities/rfc-validators'
import {
  infoSeriesPathBuilder,
  apiSubseriesPathBuilder,
  useApiV1UrlOrigin
} from '~/utilities/url'
import { useRfcEditorHead } from '~/utilities/head'
import type { SeriesId } from '~/utilities/rfc'

type Props = {
  subseriesId: SeriesId
}

const props = defineProps<Props>()

const route = useRoute()

const sanitisedId = computed(() => `${props.subseriesId.type}${props.subseriesId.number}`)

const apiV1UrlOrigin = useApiV1UrlOrigin()

const subseriesDocumentKey = computed(() => `info-subseries-${sanitisedId.value}`)
const { data: subseriesDocument, error: subseriesDocumentError } = await useAsyncData(
  subseriesDocumentKey,
  async () => {
    const subseriesPath = apiSubseriesPathBuilder(props.subseriesId.type, props.subseriesId.number)
    const maybeSubseriesDocument = await $fetch(subseriesPath, {
      method: 'GET',
      baseURL: import.meta.server ? apiV1UrlOrigin : undefined,
    })
    if (typeof maybeSubseriesDocument !== 'object') {
      console.log("Unexpected response type. The server Content-Type may be misconfigured so $fetch() doesn't parse as JSON", typeof maybeSubseriesDocument, maybeSubseriesDocument)
      throw Error(`Unable to load RFC. See console for more.`)
    }
    const { data, error } = SubseriesCommonSchema.safeParse(maybeSubseriesDocument)
    if (error) {
      console.log('Failed to validate RFC HTML JSON', error, JSON.stringify(maybeSubseriesDocument, null, 2))
      throw Error(`Unable to load RFC. See console for more.`)
    }
    return data
  })

if (subseriesDocumentError.value) {
  console.error(subseriesDocumentError.value)
  throw createError({
    statusCode: 404,
    statusMessage: `No ${sanitisedId.value} content found. If this is a new subseries please try again later.`,
    fatal: true
  })
}

const canonicalPath = infoSeriesPathBuilder(sanitisedId.value)

if (
  // only compare route.path not route.fullPath as that will clobber ?search#id params
  route.path !== canonicalPath
) {
  await navigateTo({
    path: canonicalPath
  })
}

const lastRfcPublished = computed(() => {
  if (!subseriesDocument.value) return ''
  const lastRfc = subseriesDocument.value.contents[subseriesDocument.value.contents.length - 1]
  if (!lastRfc || !lastRfc.published) return ''
  return DateTime.fromISO(lastRfc.published)
})

// see https://github.com/ietf-tools/red/issues/196
const pageTitle = subseriesDocument.value ? `${subseriesDocument.value.type.toUpperCase()} ${subseriesDocument.value.number} subseries contains ${subseriesDocument.value.contents.length} RFC${subseriesDocument.value.contents.length === 1 ? '' : 's'}` : ''

const pageDescription = subseriesDocument.value ? `${subseriesDocument.value.type.toUpperCase()}${subseriesDocument.value.number} contains ${subseriesDocument.value.contents.map(item => `RFC ${item.number}`).join(', ')}.` : ''

useRfcEditorHead({
  title: pageTitle,
  canonicalPath,
  description: pageDescription,
  modifiedDateTime: lastRfcPublished.value !== '' ? lastRfcPublished.value : undefined,
  contentType: 'article'
})
</script>
