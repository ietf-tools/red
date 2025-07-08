<template>
  <div class="min-h-[100vh]">
    <NuxtLayout name="white">
      <template v-if="rfcDocRetrieveError || rfcHtmlError">
        <div class="container mx-auto">
          <Alert
            level="1"
            variant="warning"
            heading="Error"
          >
            {{ rfcDocRetrieveError }} {{ rfcHtmlError }}
          </Alert>
        </div>
      </template>
      <template v-else-if="
        rfc &&
        rfcDocRetrieveStatus === 'success' &&
        rfcBucketHtmlDocument &&
        rfcHtmlStatus === 'success'
      ">
        <RFCDocument
          :rfc="rfc"
          :rfc-bucket-html-doc="rfcBucketHtmlDocument"
        />
      </template>
    </NuxtLayout>
  </div>
</template>

<script setup lang="ts">
import { DateTime } from 'luxon'
import type { Rfc } from '~/generated/red-client'
import { useRfcEditorHead } from '~/utilities/head'
import { rfcBucketHtmlToRfcDocument } from '~/utilities/red-rfc-html-extractor'
import { parseRFCId } from '~/utilities/rfc'
import {

  rfcToRfcCommon
} from '~/utilities/rfc-converters'

import {
  apiRfcDocRetrievePathBuilder,
  apiRfcBucketHtmlURLBuilder,
  infoRfcPathBuilder
} from '~/utilities/url'

const route = useRoute()

const id = parseRFCId(route.params.id.toString())
const rfcNumber = parseInt(id.number, 10)

const {
  data: rfcDocRetrieve,
  status: rfcDocRetrieveStatus,
  error: rfcDocRetrieveError
} = await useAsyncData<Rfc>(`info-docretrieve-${route.params.id}`, async () =>
  $fetch(apiRfcDocRetrievePathBuilder(rfcNumber))
)

const rfc = computed(() => {
  if (!rfcDocRetrieve.value) return
  return rfcToRfcCommon(rfcDocRetrieve.value)
})

const {
  data: rfcHtml,
  status: rfcHtmlStatus,
  error: rfcHtmlError
} = await useAsyncData<string>(`info-dochtml-${route.params.id}`, async () =>
  $fetch(apiRfcBucketHtmlURLBuilder(rfcNumber))
)

const { data: rfcBucketHtmlDocument } = await useAsyncData(
  `info-dochtml-${route.params.id}`,
  async () => {
    if (!rfcHtml.value) return undefined
    return await rfcBucketHtmlToRfcDocument(rfcHtml.value)
  }
)

const canonicalUrl = infoRfcPathBuilder(`rfc${rfcNumber}`)

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
