<template>
  <BodyLayoutDocument>
    <template #sidebar>
      <RFCDocumentSidebar
        v-model:selected-tab="selectedTab"
        v-model:is-modal-open="isModalOpen"
        :rfc="props.rfc"
        :rfc-bucket-html-doc="props.rfcBucketHtmlDoc"
        :goto-errata="gotoErrata"
        :change-tab="changeTab"
      />
    </template>
    <RFCDocumentBody
      v-model:is-modal-open="isModalOpen"
      :rfc="props.rfc"
      :rfc-bucket-html-doc="props.rfcBucketHtmlDoc"
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
  rfcBucketHtmlDoc: RfcBucketHtmlDocument
}

const props = defineProps<Props>()

const selectedTab = ref(0)

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
