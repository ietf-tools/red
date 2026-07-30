<template>
  <div v-if="!hasCheckedAuth" class="mt-10 w-full text-center">
    <GraphicsLoading class="inline-block w-16 h-16" />
  </div>
  <div v-else-if="isAuthenticated === false" class="mt-10 w-full text-center">
    Not logged in. <Anchor :href="HOME_PATH">Go to home</Anchor>.
  </div>
  <div v-else-if="isAuthenticated === true">
    <slot />
  </div>
</template>

<script setup lang="ts">
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
    if (
      // we have checked auth, so either they're logged in or not
      !isAuthenticated.value
    ) {
      // await navigateTo({ path: HOME_PATH })
      return
    }
    // else, they're logged in so they pass the auth wall
  }
)
</script>
