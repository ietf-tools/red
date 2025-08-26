<template>
  <div class="min-h-[100vh]">
    <NuxtLayout name="white">
      <template v-if="rfcDocRetrieveError || rfcBucketHtmlDocumentError">
        <div class="container mx-auto">
          <Alert
            level="1"
            variant="warning"
            heading="Error"
          >
            {{ rfcDocRetrieveError }}
            {{ rfcBucketHtmlDocumentError }}
          </Alert>
        </div>
      </template>
      <template v-else-if="
        rfc &&
        rfcDocRetrieveStatus === 'success' &&
        rfcBucketHtmlDocument
      ">
        <RFCDocument
          :rfc="rfc"
          :rfc-bucket-html-document="rfcBucketHtmlDocument"
        />
      </template>
    </NuxtLayout>
  </div>
</template>

<script setup lang="ts">
import { DateTime } from 'luxon'
import type { Rfc } from '../../../generated/red-client'
import { useRfcEditorHead } from '~/utilities/head'
import { safeJsonParse } from '~/utilities/json'
import { fetchRetry } from '~/utilities/network'
import { parseRFCId } from '~/utilities/rfc'
import { rfcToRfcCommon } from '~/utilities/rfc-converters'
import { RfcBucketHtmlDocumentSchema } from '~/utilities/rfc-validators'
import {
  apiRfcDocRetrievePathBuilder,
  apiRfcBucketDocumentURLBuilder,
  infoRfcPathBuilder,
  rfcFormatPathBuilder,
  PUBLIC_SITE
} from '~/utilities/url'

const route = useRoute()
const paramsId = route.params.id

if (paramsId === undefined) {
  throw createError({
    statusCode: 500,
    statusMessage: 'Not a valid route param "id"',
    fatal: true
  })
}

const id = parseRFCId(paramsId.toString())
const rfcNumber = parseInt(id.number, 10)
const sanitisedId = `${id.type}${rfcNumber}`

const {
  data: rfcDocRetrieve,
  status: rfcDocRetrieveStatus,
  error: rfcDocRetrieveError
} = await useAsyncData<Rfc>(`info-docretrieve-${sanitisedId}`, async () =>
  $fetch(apiRfcDocRetrievePathBuilder(rfcNumber))
)

const rfc = computed(() => {
  if (!rfcDocRetrieve.value) return
  return rfcToRfcCommon(rfcDocRetrieve.value)
})

const { data: rfcBucketHtmlDocument, error: rfcBucketHtmlDocumentError } = await useAsyncData(
  `info-buckethtmldocument-${sanitisedId}`,
  async () => {
    const url = apiRfcBucketDocumentURLBuilder(rfcNumber)
    const response = await fetchRetry(url)
    if (!response.ok) {
      throw Error(`${response.status}: ${response.statusText} ${url}`)
    }
    const text = await response.text()
    const maybeRfcBucketDocument = safeJsonParse(text)
    if (typeof maybeRfcBucketDocument !== 'object') {
      const errorTitle = `Expected JSON object from ${url} but received ${typeof maybeRfcBucketDocument}`
      console.log(errorTitle, maybeRfcBucketDocument)
      throw Error(`${errorTitle}. See console for more.`)
    }
    const { data, error } = RfcBucketHtmlDocumentSchema.safeParse(maybeRfcBucketDocument)
    if (error) {
      console.log('Failed to validate', JSON.stringify(maybeRfcBucketDocument, null, 2), error)
      throw error
    }
    return data
  })

if (rfcDocRetrieveError.value) {
  console.error(rfcDocRetrieveError.value, rfcBucketHtmlDocumentError.value)
  throw createError({
    statusCode: 404,
    statusMessage: 'Not Found',
    fatal: true
  })
}

if (rfcBucketHtmlDocumentError.value) {
  console.error(rfcBucketHtmlDocumentError.value)
  throw createError({
    statusCode: 404,
    statusMessage: `No ${sanitisedId} content found. If this is a new RFC please try again later. Try also ${PUBLIC_SITE}${rfcFormatPathBuilder(sanitisedId, 'html')}`,
    fatal: true
  })
}

const canonicalUrl = infoRfcPathBuilder(sanitisedId)

useRfcEditorHead({
  title: rfcDocRetrieve.value?.title ?? '',
  canonicalUrl,
  description: rfcDocRetrieve.value?.abstract ?? '',
  modifiedDateTime:
    rfcDocRetrieve.value?.published ?
      DateTime.fromISO(rfcDocRetrieve.value.published)
      : undefined,
  contentType: 'article'
})

definePageMeta({
  layout: false
})
</script>
