<template>
  <RFCDocumentRateThisRFC :rfc-number="props.rfcNumber" v-model="userRFCRating" />
</template>

<script setup lang="ts">
type Props = {
  rfcNumber: number
}

const props = defineProps<Props>()
const userRFCRating = defineModel<number | undefined>()
</script>
