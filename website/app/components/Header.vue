<template>
  <header class="flex-1 bg-blue-900 text-white dark:bg-blue-950 relative print:hidden">
    <a id="top"></a>
    <HeaderSkipToContent />
    <FeatureFlagsToast />
    <nav aria-label="Primary">
      <div class="container pl-5 pr-3 mx-auto flex justify-between py-4 w-full">
        <GraphicsHeaderLogos />
        <nav class="flex flex-1 flex-row justify-end content-end">
          <h2 class="sr-only">Primary navigation</h2>
          <HeaderNavMobile />
          <HeaderNavDesktop />
        </nav>
      </div>
      <HeaderNavMobileNoScript />
    </nav>
    <FeatureFlagsModal />
    <!-- optional slot used to extend the header eg for the homepage -->
    <slot />
  </header>
</template>
