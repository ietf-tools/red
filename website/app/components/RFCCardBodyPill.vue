<template>
  <Pill
    v-if="tagText.length > 0"
    size="small"
    :text="tagText"
    :class="[
      'z-1 print:m-0 my-2',
      {
        relative: props.mode === 'relative'
      }
    ]" />
</template>

<script setup lang="ts">
import { getRfcPillText } from '~/utilities/rfc'
import type { RfcCommon } from '~/utilities/rfc-validators'

type Props = {
  rfc: RfcCommon
  mode?: 'relative' | 'none'
}

const props = withDefaults(defineProps<Props>(), { mode: 'relative' })

const tagText = computed(() => getRfcPillText(props.rfc))
</script>
