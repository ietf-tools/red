<template>
  <header class="flex-1 bg-blue-900 text-white dark:bg-blue-950 relative print:hidden">
    <a id="top"></a>
    <HeaderSkipToContent />
    <nav class="container pl-5 pr-3 mx-auto flex justify-between py-4 w-full">
      <GraphicsHeaderLogos />
      <div class="flex flex-1 flex-row justify-end content-end">
        <HeaderNavMobile />
        <HeaderNavDesktop />
      </div>
    </nav>
    <!-- slot used to extend the header eg for the homepage -->
    <slot />
  </header>
</template>
