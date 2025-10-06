<template>
  <BodyLayoutDocument>
    <template #sidebar>
      <RFCDocumentSidebar v-if="rfcBucketHtmlDocument" v-model:selected-tab="selectedTab"
        v-model:is-modal-open="isModalOpen" :rfc-bucket-html-document="rfcBucketHtmlDocument"
        :has-table-of-contents="hasToc" :goto-errata="gotoErrata" :change-tab="changeTab" />
    </template>
    <template v-if="rfcBucketHtmlDocumentError">
      <div class="container mx-auto">
        <Alert level="1" variant="warning" heading="Error">
          {{ rfcBucketHtmlDocumentError }}
        </Alert>
      </div>
    </template>

    <RFCDocumentBody v-if="rfcBucketHtmlDocument" v-model:is-modal-open="isModalOpen"
      :rfc-bucket-html-document="rfcBucketHtmlDocument" :breadcrumb-items="breadcrumbItems" :goto-errata="gotoErrata"
      :change-tab="changeTab" />
  </BodyLayoutDocument>
</template>

<script setup lang="ts">
import { DateTime } from 'luxon'
import { RfcBucketHtmlDocumentSchema } from '~/utilities/rfc-validators'
import {
  apiRfcBucketDocumentPathBuilder,
  infoRfcPathBuilder,
  rfcFormatPathBuilder,
  PUBLIC_SITE
} from '~/utilities/url'
import { useRfcEditorHead } from '~/utilities/head'
import type { RFCId } from '~/utilities/rfc'
import type { BreadcrumbItem } from '~/components/BreadcrumbsTypes'

type Props = {
  rfcId: RFCId
}

const props = defineProps<Props>()

const sanitisedId = computed(() => `${props.rfcId.type}${props.rfcId.number}`)

const asyncRfcBucketHtmlDocumentKey = computed(() => `info-buckethtmldocument-${sanitisedId.value}`)
const { data: rfcBucketHtmlDocument, error: rfcBucketHtmlDocumentError } = await useAsyncData(
  asyncRfcBucketHtmlDocumentKey,
  async () => {
    const url = apiRfcBucketDocumentPathBuilder(parseInt(props.rfcId.number, 10))
    const maybeRfcBucketDocument = await $fetch(url, {
      method: 'GET',
    })
    if (typeof maybeRfcBucketDocument !== 'object') {
      console.log("Unexpected response type. The server Content-Type may be misconfigured so $fetch() doesn't parse as JSON", typeof maybeRfcBucketDocument, maybeRfcBucketDocument)
      throw Error(`Unable to load RFC. See console for more.`)
    }
    const { data, error } = RfcBucketHtmlDocumentSchema.safeParse(maybeRfcBucketDocument)
    if (error) {
      console.log('Failed to validate RFC HTML JSON', error, JSON.stringify(maybeRfcBucketDocument, null, 2))
      throw Error(`Unable to load RFC. See console for more.`)
    }
    return data
  })

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
  title: rfcBucketHtmlDocument.value?.rfc.title ?? '',
  canonicalUrl,
  description: rfcBucketHtmlDocument.value?.rfc.abstract ?? '',
  modifiedDateTime:
    rfcBucketHtmlDocument.value?.rfc.published ?
      DateTime.fromISO(rfcBucketHtmlDocument.value?.rfc.published)
      : undefined,
  contentType: 'article'
})
</script>
