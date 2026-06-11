<template>
  <img v-bind="$attrs" class="dark:invert my-5" :alt="alt" />
</template>

<script setup lang="ts">
defineOptions({ inheritAttrs: false })
const attrs = useAttrs()

if (import.meta.dev && attrs.alt === undefined) {
  console.warn('[ProseImg] Missing alt attribute on image:', attrs.src)
}

const alt = computed(() => (typeof attrs.alt === 'string' ? attrs.alt : ''))
</script>
