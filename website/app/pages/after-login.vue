<template>
  <Heading level="1" class="text-center mt-10" style-level="3">Logged in...</Heading>
  <noscript>
    <a :href="HOME_PATH">Go to homepage</a>
  </noscript>
</template>

<script setup lang="ts">
import Heading from '~/components/Heading.vue'
import { useRfcEditorHead } from '~/utilities/head'
import { useOidcSession } from '~/utilities/oidc'
import { AFTER_LOGIN_PATH, HOME_PATH } from '~/utilities/url-constants'

definePageMeta({
  layout: false
})

useOidcSession()

useRfcEditorHead({
  noIndex: true,
  title: 'Logged in...',
  canonicalPath: AFTER_LOGIN_PATH,
  contentType: 'website'
})
</script>
