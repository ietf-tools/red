<template>
  <div class="relative z-1"><slot /></div>
</template>

<script setup lang="ts">
// This component sets a typical CSS z-index.
//
// This component is an optional wrapper for <Card>'s default slot. Usage like,
//     <Card><CardContent>...</CardContent></Card>
// or,
//     <Card><template #headingTitle>...</template><CardContent>...</CardContent></Card>
//
// Don't use this component if you need control over z-index, ie to raise a button
// above the <Card> cover link such as Subseries links (eg search for RFC 2119 and note 'BCP 14'
// link), or the 'Show abstract' button on mobile search results.
// But if you do this be sure to read the various code comments in Card.vue and
// RFCCard.vue about the subtle z-index stacking order.
</script>
