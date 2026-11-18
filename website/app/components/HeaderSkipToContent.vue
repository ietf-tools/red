<template>
  <a
    href="#main"
    class="absolute opacity-0 bg-white text-black left-[40%] m-2 px-3 py-1 will-change-transform motion-safe:transition-transform -translate-y-[4em] focus:translate-y-0 focus:opacity-100"
    @click="onClick">
    Skip to content
  </a>
</template>

<script setup lang="ts">
import { focusMainHeading } from '~/utilities/focus-target'

// See https://github.com/ietf-tools/red/issues/213
// it's important to hide visibility even though it's offscreen because of how Safari renders content offscreen during a swipe

// Without JavaScript the link goes to #main. With it, the reader lands on the page's heading instead, and the
// address doesn't gain a `#main` that Back would then step through. A page without a heading keeps the link.
const onClick = (event: MouseEvent) => {
  if (focusMainHeading()) {
    event.preventDefault()
  }
}
</script>
