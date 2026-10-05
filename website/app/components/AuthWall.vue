<template>
  <div v-if="!hasCheckedAuth" class="mt-10 w-full text-center">
    <GraphicsLoading class="inline-block w-16 h-16" />
  </div>
  <div v-else-if="isAuthenticated === false" class="mt-10 w-full text-center">
    <Heading level="1" style-level="2">You need an account to</Heading>

    <LoginModalFeatureWall class="mt-6 mx-auto max-w-120" />

    <p class="mt-10">...or <Anchor :href="HOME_PATH" :class="ANCHOR_COLOR_TAILWIND_STYLE">go to home page</Anchor>.</p>
  </div>
  <div v-else-if="isAuthenticated === true">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { oidcLogin, oidcRegister } from '~/utilities/oidc'
import { ANCHOR_COLOR_TAILWIND_STYLE } from '~/utilities/theme'
import { HOME_PATH } from '~/utilities/url'

const authStore = useAuthStore()
const { isAuthenticated, hasCheckedAuth } = storeToRefs(authStore)

watch(
  () => hasCheckedAuth?.value,
  async () => {
    if (hasCheckedAuth.value === false) {
      // do nothing, wait until authed
      return
    }
    // we have checked auth, so either they're logged in or not
    if (!isAuthenticated.value) {
      // await navigateTo({ path: HOME_PATH })
      return
    }
    // else, they're logged in so they pass the auth wall
  }
)
</script>
