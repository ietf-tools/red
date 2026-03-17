<template>
  <noscript data-nosnippet>
    <slot />
  </noscript>
</template>

<script setup lang="ts">
/**
 * What does 'safe' mean in this context?
 *
 * We never want <noscript> content to appear in search results, so we'll use
 * the `data-nosnippet` as a hint to Googlebot etc to exclude it from search descriptions.
 *
 * See this related DataTracker issue https://github.com/ietf-tools/datatracker/issues/9667
 */
</script>
