<template>
  <BodyLayoutDocument>
    <template #sidebar>
      <RFCDocumentSidebar
        v-if="rfcBucketHtmlDocument"
        v-model:selected-tab="selectedTab"
        v-model:is-modal-open="isModalOpen"
        :rfc-bucket-html-document="rfcBucketHtmlDocument"
        :has-table-of-contents="hasToc"
        :goto-errata="gotoErrata"
        :change-tab="changeTab"
      />
    </template>
    <template v-if="rfcBucketHtmlDocumentError">
      <div class="container mx-auto">
        <Alert
          level="1"
          variant="warning"
          heading="Error"
        >
          {{ rfcBucketHtmlDocumentError }}
        </Alert>
      </div>
    </template>

    <RFCDocumentBody
      v-if="rfcBucketHtmlDocument"
      v-model:is-modal-open="isModalOpen"
      :rfc-bucket-html-document="rfcBucketHtmlDocument"
      :breadcrumb-items="breadcrumbItems"
      :goto-errata="gotoErrata"
      :change-tab="changeTab"
    />
  </BodyLayoutDocument>
</template>

<script setup lang="ts">
import { DateTime } from 'luxon'
import { RfcBucketHtmlDocumentSchema } from '~/utilities/rfc-validators'
import {
  apiRfcBucketDocumentPathBuilder,
  infoSeriesPathBuilder,
  rfcFormatPathBuilder,
  usePublicSiteUrlOrigin
} from '~/utilities/url'
import { rfcCommonToGoogleScholar, useRfcEditorHead } from '~/utilities/head'
import type { SeriesId } from '~/utilities/rfc'
import type { BreadcrumbItem } from '~/components/BreadcrumbsTypes'

type Props = {
  rfcId: SeriesId
}

const props = defineProps<Props>()

const sanitisedId = computed(() => `${props.rfcId.type}${props.rfcId.number}`)

const asyncRfcBucketHtmlDocumentKey = computed(
  () => `info-buckethtmldocument-${sanitisedId.value}`
)
const { data: rfcBucketHtmlDocument, error: rfcBucketHtmlDocumentError } =
  await useAsyncData(
    asyncRfcBucketHtmlDocumentKey,
    async () => {
      const path = apiRfcBucketDocumentPathBuilder(props.rfcId.number)
      const maybeRfcBucketDocument = await $fetch(path, {
        method: 'GET'
      })
      if (typeof maybeRfcBucketDocument !== 'object') {
        console.log(
          "Unexpected response type. The server Content-Type may be misconfigured so $fetch() doesn't parse as JSON",
          typeof maybeRfcBucketDocument,
          maybeRfcBucketDocument
        )
        throw Error(`Unable to load RFC. See console for more.`)
      }
      const { data, error } = RfcBucketHtmlDocumentSchema.safeParse(
        maybeRfcBucketDocument
      )
      if (error) {
        console.error(
          'Failed to validate RFC HTML JSON',
          error,
          JSON.stringify(maybeRfcBucketDocument, null, 2)
        )
        throw Error(
          `Unable to load RFC (RFC data failed validation). See console for more. ${JSON.stringify(error)}`
        )
      }
      return data
    },
    {
      server: true // we want server fetching so that we can generate server HTTP 404s if necessary
    }
  )

const publicSiteUrlOrigin = usePublicSiteUrlOrigin()

if (rfcBucketHtmlDocumentError.value) {
  console.error(rfcBucketHtmlDocumentError.value)
  throw createError({
    statusCode: 404,
    statusMessage: `No ${sanitisedId.value} content found. If this is a recently published RFC please try again later. Try also ${publicSiteUrlOrigin}${rfcFormatPathBuilder(sanitisedId.value, 'html')}`,
    fatal: true
  })
}

const hasToc = computed(() =>
  Boolean(
    rfcBucketHtmlDocument.value?.tableOfContents?.sections &&
    rfcBucketHtmlDocument.value?.tableOfContents?.sections.length > 0
  )
)

const selectedTab = ref(hasToc.value ? 0 : 1)

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

const breadcrumbItems: BreadcrumbItem[] = [{ url: '/', label: 'Home' }]

const isModalOpen = ref(false)

const canonicalPath = infoSeriesPathBuilder(sanitisedId.value)

// see https://github.com/ietf-tools/red/issues/196
const pageTitle =
  rfcBucketHtmlDocument.value ?
    `RFC ${rfcBucketHtmlDocument.value.rfc.number}: ${rfcBucketHtmlDocument.value.rfc.title}`
    : ''

const resourceTimestampDatetime =
  rfcBucketHtmlDocument.value ?
    DateTime.fromISO(rfcBucketHtmlDocument.value.timestampIso)
    : undefined

const publicSiteOrigin = usePublicSiteUrlOrigin()

useRfcEditorHead({
  title: pageTitle,
  canonicalPath,
  description: rfcBucketHtmlDocument.value?.rfc.abstract ?? '',
  modifiedDateTime:
    rfcBucketHtmlDocument.value?.rfc.published ?
      DateTime.fromISO(rfcBucketHtmlDocument.value.rfc.published)
      : undefined,
  contentType: 'article',
  customThumbnail: rfcBucketHtmlDocument.value ? `rfc${rfcBucketHtmlDocument.value.rfc.number}` : undefined,
  customThumbnailAltText: rfcBucketHtmlDocument.value ? `RFC ${rfcBucketHtmlDocument.value.rfc.number}: ${rfcBucketHtmlDocument.value.rfc.title}${rfcBucketHtmlDocument.value.rfc.abstract ? `. ${rfcBucketHtmlDocument.value.rfc.abstract}.` : ''}` : undefined,
  resourceTimestamps:
    resourceTimestampDatetime ?
      [
        {
          name: `info-${sanitisedId.value}`,
          timestamp: resourceTimestampDatetime
        }
      ]
      : undefined,
  googleScholarMetadata: rfcBucketHtmlDocument.value ? rfcCommonToGoogleScholar(rfcBucketHtmlDocument.value.rfc, publicSiteOrigin) : undefined
})
</script>
