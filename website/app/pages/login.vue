<template>
  <Heading level="1" class="text-center mt-10" style-level="3">Please wait...</Heading>
  <noscript>
    <p>Login requires JavaScript.</p>
    <a :href="HOME_PATH">Go to homepage.</a>
  </noscript>
</template>

<script setup lang="ts">
import Heading from '~/components/Heading.vue'
import { useRfcEditorHead } from '~/utilities/head'
import { oidcLoginTo, useOidcSession } from '~/utilities/oidc'
import { AFTER_LOGIN_PATH, HOME_PATH, LOGIN_PATH } from '~/utilities/url-constants'

definePageMeta({
  layout: false
})

// Registered first so its onMounted initialises the UserManager that oidcLoginTo needs.
useOidcSession()

onMounted(() => {
  void oidcLoginTo(AFTER_LOGIN_PATH)
})

useRfcEditorHead({
  noIndex: true,
  title: 'Logging in...',
  canonicalPath: LOGIN_PATH,
  contentType: 'website'
})
</script>
