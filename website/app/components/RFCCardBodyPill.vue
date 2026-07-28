<template>
  <Pill v-if="tagText.length > 0" size="small" :text="tagText" class="relative z-1 print:m-0" />
</template>

<script setup lang="ts">
import { getRfcPillText } from '~/utilities/rfc'
import type { RfcCommon } from '~/utilities/rfc-validators'

type Props = {
  rfc: RfcCommon
}

const props = defineProps<Props>()

const tagText = computed(() => getRfcPillText(props.rfc))
</script>
