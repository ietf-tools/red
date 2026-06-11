<template>
  <PreCopyButton
    :class="`inline-block max-w-screen overflow-x-auto p-1 bg-gray-50 dark:bg-blue-950 ${
      '' // in <pre> make sure no whitespace before/after <slot />
    }`"
    ><slot
  /></PreCopyButton>
</template>

<script setup lang="ts">
// <pre>formatted text can be wider than the page by not wrapping
// so this ensures that wide <pre> styles don't break (eg) mobile layouts
</script>
