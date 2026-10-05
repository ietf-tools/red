<template>
  <div class="container mx-auto">
    <Heading level="1" class="text-center mt-10" style-level="3" role="status">{{ message }}</Heading>
    <p v-if="nextPath" class="text-center mt-10">
      <Anchor :href="nextPath">Continue</Anchor>
    </p>
  </div>
</template>

<script setup lang="ts">
import Heading from '~/components/Heading.vue'
import { useAuthStore } from '~/stores/auth'
import { useRfcEditorHead } from '~/utilities/head'
import { useOidcSession } from '~/utilities/oidc'
import { AFTER_LOGIN_PATH, HOME_PATH } from '~/utilities/url-constants'

definePageMeta({
  layout: false
})

useOidcSession()

const { hasCheckedAuth, isAuthenticated, returnTo } = storeToRefs(useAuthStore())

type Mode =
  | {
      type: 'checking'
    }
  | {
      type: 'logged-out'
    }
  | {
      type: 'logged-in'
    }
  | {
      type: 'logged-in-return-to'
      returnTo: string
    }

const mode = computed<Mode>(() => {
  if (!hasCheckedAuth.value) {
    return { type: 'checking' }
  }
  if (!isAuthenticated.value) {
    return { type: 'logged-out' }
  }
  return returnTo.value ? { type: 'logged-in-return-to', returnTo: returnTo.value } : { type: 'logged-in' }
})

const message = computed(() => {
  const { value } = mode
  switch (value.type) {
    case 'checking':
      return 'Checking sign-in status...'
    case 'logged-out':
      return 'Not signed in.'
    case 'logged-in':
    case 'logged-in-return-to':
      return 'Signed in'
  }
})

const nextPath = computed(() => {
  const { value } = mode
  switch (value.type) {
    case 'logged-in-return-to':
      return value.returnTo
    case 'logged-in':
      return HOME_PATH
    case 'logged-out':
      return HOME_PATH
    case 'checking':
      return undefined
  }
})

const router = useRouter()

watch(nextPath, () => {
  const { value } = nextPath
  if (!value) {
    return
  }
  router.push(value)
})

useRfcEditorHead({
  noIndex: true,
  title: 'Signing in...',
  canonicalPath: AFTER_LOGIN_PATH,
  contentType: 'website'
})
</script>
