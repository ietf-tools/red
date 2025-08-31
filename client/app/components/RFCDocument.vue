<template>
  <BodyLayoutDocument>
    <template #sidebar>
      <RFCDocumentSidebar
        v-if="rfc && rfcBucketHtmlDocument"
        v-model:selected-tab="selectedTab"
        v-model:is-modal-open="isModalOpen"
        :rfc="rfc"
        :rfc-bucket-html-document="rfcBucketHtmlDocument"
        :has-table-of-contents="hasToc"
        :goto-errata="gotoErrata"
        :change-tab="changeTab"
      />
    </template>
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

    <RFCDocumentBody
      v-if="rfc && rfcBucketHtmlDocument"
      v-model:is-modal-open="isModalOpen"
      :rfc="rfc"
      :rfc-bucket-html-document="rfcBucketHtmlDocument"
      :breadcrumb-items="breadcrumbItems"
      :goto-errata="gotoErrata"
      :change-tab="changeTab"
    />
  </BodyLayoutDocument>
</template>

<script setup lang="ts">
import { DateTime } from 'luxon'
import { safeJsonParse } from '~/utilities/json'
import { fetchRetry } from '~/utilities/network'
import { rfcToRfcCommon } from '~/utilities/rfc-converters'
import { RfcBucketHtmlDocumentSchema } from '~/utilities/rfc-validators'
import {
  apiRfcDocRetrievePathBuilder,
  apiRfcBucketDocumentURLBuilder,
  infoRfcPathBuilder,
  rfcFormatPathBuilder,
  PUBLIC_SITE
} from '~/utilities/url'
import { useRfcEditorHead } from '~/utilities/head'
import type { RFCId } from '~/utilities/rfc'
import type { BreadcrumbItem } from '~/components/BreadcrumbsTypes'
import type { Rfc } from '~~/generated/red-client'

type Props = {
  rfcId: RFCId
}

const props = defineProps<Props>()

const sanitisedId = computed(() => `${props.rfcId.type}${props.rfcId.number}`)

const asyncRfcDocRetrieveKey = computed(() => `info-docretrieve-${sanitisedId.value}`)
const {
  data: rfcDocRetrieve,
  error: rfcDocRetrieveError
} = await useAsyncData<Rfc>(asyncRfcDocRetrieveKey, async () =>
  $fetch(apiRfcDocRetrievePathBuilder(parseInt(props.rfcId.number, 10)))
)

const rfc = computed(() => {
  if (!rfcDocRetrieve.value) return
  return rfcToRfcCommon(rfcDocRetrieve.value)
})

const asyncRfcBucketHtmlDocumentKey = computed(() => `info-buckethtmldocument-${sanitisedId.value}`)
const { data: rfcBucketHtmlDocument, error: rfcBucketHtmlDocumentError } = await useAsyncData(
  asyncRfcBucketHtmlDocumentKey,
  async () => {
    const url = apiRfcBucketDocumentURLBuilder(parseInt(props.rfcId.number, 10))
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
    statusMessage: `No ${sanitisedId.value} content found. If this is a new RFC please try again later. Try also ${PUBLIC_SITE}${rfcFormatPathBuilder(sanitisedId.value, 'html')}`,
    fatal: true
  })
}

const hasToc = computed(() => Boolean(
  rfcBucketHtmlDocument.value?.tableOfContents?.sections &&
  rfcBucketHtmlDocument.value?.tableOfContents?.sections.length > 0
))

const selectedTab = ref(
  hasToc.value ? 0 : 1
)

function changeTab(index: number) {
  selectedTab.value = index
}

function gotoErrata() {
  const responsiveModeStore = useResponsiveModeStore()

  if (responsiveModeStore.responsiveMode === 'Mobile') {
    isModalOpen.value = true
  }

  selectedTab.value = 2

  nextTick(() => {
    // there are potentially two in the DOM but only one should be visible
    const errataTabs =
      document.querySelectorAll<HTMLElement>('[data-errata-tab]')

    function focusIfVisible(elm: HTMLElement) {
      if (elm.checkVisibility()) {
        elm.focus()
      }
    }

    if (errataTabs) {
      errataTabs.forEach(focusIfVisible)
    }
  })
}

const breadcrumbItems: BreadcrumbItem[] = [
  { url: '/', label: 'Home' },
  { url: '/info', label: 'Documents' }
]

const isModalOpen = ref(false)

const canonicalUrl = infoRfcPathBuilder(sanitisedId.value)

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
</script>
