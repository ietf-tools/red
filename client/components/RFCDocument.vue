<template>
  <BodyLayoutDocument>
    <template #sidebar>
      <RFCDocumentSidebar
        v-model:selected-tab="selectedTab"
        v-model:is-modal-open="isModalOpen"
        :rfc="props.rfc"
        :rfc-bucket-html-document="props.rfcBucketHtmlDocument"
        :has-table-of-contents="hasToc"
        :goto-errata="gotoErrata"
        :change-tab="changeTab"
      />
    </template>
    <RFCDocumentBody
      v-model:is-modal-open="isModalOpen"
      :rfc="props.rfc"
      :rfc-bucket-html-document="props.rfcBucketHtmlDocument"
      :breadcrumb-items="breadcrumbItems"
      :goto-errata="gotoErrata"
      :change-tab="changeTab"
    />
  </BodyLayoutDocument>
</template>

<script setup lang="ts">
import type { RfcBucketHtmlDocument, RfcCommon } from '~/utilities/rfc'
import type { BreadcrumbItem } from '~/components/BreadcrumbsTypes'

type Props = {
  rfc: RfcCommon
  rfcBucketHtmlDocument: RfcBucketHtmlDocument
}

const props = defineProps<Props>()

const hasToc = computed(() => Boolean(
  props.rfcBucketHtmlDocument.tableOfContents?.sections &&
  props.rfcBucketHtmlDocument.tableOfContents?.sections.length > 0
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
</script>
