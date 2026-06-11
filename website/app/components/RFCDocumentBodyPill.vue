<template>
  <div class="flex flex-row justify-between items-center flex-wrap print:justify-center">
    <div class="flex items-center gap-4 print:text-center">
      <Pill v-if="tagText.length > 0" size="normal" :text="tagText" class="print:mt-3 my-2" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { getRfcPillText } from '~/utilities/rfc'
import type { RfcCommon } from '~/utilities/rfc'

type Props = {
  rfc: RfcCommon
}

const props = defineProps<Props>()

const tagText = computed(() => getRfcPillText(props.rfc))
</script>
