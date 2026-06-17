<template>
  <AbnfViewer :abnf-text="abnfText" />
</template>

<script setup lang="ts">
// Async wrapper around AbnfViewer to split it into its own JS chunk.
const AbnfViewer = defineAsyncComponent(() => import('./AbnfViewer.vue'))
defineProps<{ abnfText: string }>()
</script>
