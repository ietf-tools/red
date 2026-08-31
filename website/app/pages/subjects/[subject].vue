<template>
  <div class="min-h-[100vh]">
    <NuxtLayout name="default">
      <div class="container mx-auto pl-5 pr-3">...</div>
    </NuxtLayout>
  </div>
</template>

<script setup lang="ts">
import { useRfcEditorHead } from '~/utilities/head'
import { usePublicSiteUrlOrigin } from '~/utilities/url'

definePageMeta({
  layout: false
})

const publicSiteUrlOrigin = usePublicSiteUrlOrigin()

const {
  data: subject,
  status: subjectStatus,
  error: subjectError
} = await useAsyncData(() => {
  // subject goes here
})

useRfcEditorHead({
  title: `RFC subject ${subject}`,
  canonicalPath: `${publicSiteUrlOrigin}/`,
  description: 'Subjects such as networking, broadband, aerospace, authentication, cloud computing',
  contentType: 'article'
})
</script>
