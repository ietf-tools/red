<template>
  <NuxtLayout name="auth" has-sub-header>
    <template #subheader>
      <Breadcrumbs :breadcrumb-items="breadcrumbItems" class="flex-1 container mx-auto pl-5" />
      <div v-if="user" class="container mx-auto px-4 pt-5">
        <Heading level="1">Welcome, {{ user.name }}</Heading>
        <p class="py-2">
          <bdi translate="no">{{ user.email }}</bdi>
        </p>
      </div>
    </template>
    <div v-if="user" class="container mx-auto px-4 pt-5 flex">
      <div class="flex-1 min-w-0">
        <Heading level="2">Your notifications</Heading>
        ...
      </div>
      <div>
        <Heading level="2" style-level="3">Your sets</Heading>
        ...
      </div>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import type { BreadcrumbItem } from '~/components/BreadcrumbsTypes'
import { useRfcEditorHead } from '~/utilities/head'
import { ACCOUNT_HOME_PATH } from '~/utilities/url'

const route = useRoute()

const canonicalPath = ACCOUNT_HOME_PATH
if (route.path !== canonicalPath) {
  await navigateTo({ path: canonicalPath })
}

const breadcrumbItems: BreadcrumbItem[] = [{ url: '/', label: 'Home' }, { label: 'Your account' }]

const authStore = useAuthStore()
const { user } = storeToRefs(authStore)

useRfcEditorHead({
  title: 'User account homepage',
  noIndex: true,
  canonicalPath,
  description: 'Subscriptions, etc',
  contentType: 'website'
})

definePageMeta({
  layout: false
})
</script>
