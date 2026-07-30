<template>
  <AuthWall>
    <div class="mt-10 w-full text-center">logged in features...</div>
  </AuthWall>
</template>

<script setup lang="ts">
import { useRfcEditorHead } from '~/utilities/head'
import { ACCOUNT_HOME_PATH } from '~/utilities/url'

const route = useRoute()

const canonicalPath = ACCOUNT_HOME_PATH
if (route.path !== canonicalPath) {
  await navigateTo({ path: canonicalPath })
}

useRfcEditorHead({
  title: 'User account homepage',
  noIndex: true,
  canonicalPath,
  description: 'Subscriptions, etc',
  contentType: 'website'
})
</script>
