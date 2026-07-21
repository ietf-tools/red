<template>
  <header class="flex-1 relative print:hidden">
    <a id="top"></a>
    <HeaderSkipToContent />
    <FeatureFlagsToast />
    <div aria-label="Primary">
      <div class="container pl-5 pr-3 mx-auto flex justify-between py-4 w-full">
        <GraphicsHeaderLogos />
        <nav aria-label="Primary" class="flex flex-1 flex-row justify-end content-end">
          <h2 class="sr-only">Primary navigation</h2>
          <HeaderNavMobile />
          <HeaderNavDesktop />
        </nav>
      </div>
      <HeaderNavMobileNoScript />
    </div>
    <FeatureFlagsModal />
    <!-- optional slot used to extend the header eg for the homepage -->
    <slot />
  </header>
</template>

<script setup lang="ts">
import { oidcRestore } from '~/utilities/oidc'
import { useFeatureFlags } from '~/utilities/feature-flags'
import { useAuthStore } from '~/stores/auth'

const { public: config } = useRuntimeConfig()
const featureFlags = useFeatureFlags()
const authStore = useAuthStore()

// Restore any OIDC session (or complete a login callback) when the Personalisation
// flag is on. Runs only in the browser (onMounted) as a post-hydration enhancement;
// reactive + immediate so it fires whether the flag is already set at load or toggled
// on later. Never redirects — an existing session is restored from localStorage and
// refreshed via the refresh token; only an explicit Sign in redirects.
onMounted(() => {
  watch(
    () => featureFlags.value.oidc,
    (enabled) => {
      if (!enabled) {
        return
      }
      void oidcRestore({
        authority: config.oidcIssuerUri,
        clientId: config.oidcClientId,
        redirectUri: window.location.origin + config.oidcHomeUrl,
        scopes: config.oidcScopes.split(' ').filter(Boolean)
      })
        .then((user) => {
          if (user) {
            authStore.setUser(user)
          }
        })
        .catch((error) => {
          console.error('[oidc] restore failed', error)
        })
    },
    { immediate: true }
  )
})
</script>
