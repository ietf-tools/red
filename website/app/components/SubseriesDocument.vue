<template>
  <BodyLayoutDocument>
    <template v-if="subseriesDocumentError">
      <div class="container mx-auto">
        <Alert level="1" variant="warning" heading="Error">
          {{ subseriesDocumentError }}
        </Alert>
      </div>
    </template>

    <div class="min-h-screen ">
      <div v-if="subseriesDocument" class="md:mx-2 grid grid-cols-1 mt-3 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <RFCCard v-for="rfc in subseriesDocument.contents" :key="rfc.number" :rfc="rfc" heading-level="3"
          :show-abstract="true" />
      </div>
    </div>
  </BodyLayoutDocument>
</template>

<script setup lang="ts">
import { DateTime } from 'luxon'
import { InfoSubseriesItemSchema } from '~/utilities/rfc-validators'
import {
  infoSeriesPathBuilder,
  apiSubseriesPathBuilder
} from '~/utilities/url'
import { useRfcEditorHead } from '~/utilities/head'
import type { SeriesId } from '~/utilities/rfc'

type Props = {
  subseriesId: SeriesId
}

const props = defineProps<Props>()

const sanitisedId = computed(() => `${props.subseriesId.type}${props.subseriesId.number}`)

const subseriesDocumentKey = computed(() => `info-subseries-${sanitisedId.value}`)
const { data: subseriesDocument, error: subseriesDocumentError } = await useAsyncData(
  subseriesDocumentKey,
  async () => {
    const url = apiSubseriesPathBuilder(props.subseriesId.type, props.subseriesId.number)
    const maybeRfcBucketDocument = await $fetch(url, {
      method: 'GET',
    })
    if (typeof maybeRfcBucketDocument !== 'object') {
      console.log("Unexpected response type. The server Content-Type may be misconfigured so $fetch() doesn't parse as JSON", typeof maybeRfcBucketDocument, maybeRfcBucketDocument)
      throw Error(`Unable to load RFC. See console for more.`)
    }
    const { data, error } = InfoSubseriesItemSchema.safeParse(maybeRfcBucketDocument)
    if (error) {
      console.log('Failed to validate RFC HTML JSON', error, JSON.stringify(maybeRfcBucketDocument, null, 2))
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

const canonicalUrl = infoSeriesPathBuilder(sanitisedId.value)

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
  canonicalUrl,
  description: pageDescription,
  modifiedDateTime: lastRfcPublished.value !== '' ? lastRfcPublished.value : undefined,
  contentType: 'article'
})
</script>
