<template>
  <header class="flex-1 relative print:hidden">
    <a id="top"></a>
    <HeaderSkipToContent />
    <FeatureFlagsToast />
    <div>
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
import { useOidcSession } from '~/utilities/oidc'

// Restores the OIDC session on the client when the Personalisation flag is on.
// All logic lives in the composable; the header just activates it.
useOidcSession()
</script>
