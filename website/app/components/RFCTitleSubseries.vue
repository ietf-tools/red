<template>
  <component :is="subseriesVNode" />
</template>

<script setup lang="ts">
import { formatSubseriesAsVNode } from '~/utilities/rfc-title'
import type { RfcCommon } from '~/utilities/rfc-validators'

type Props = {
  rfc: RfcCommon
  hasTrailingColon: boolean
}

const props = defineProps<Props>()
const subseriesVNode = computed(() => formatSubseriesAsVNode(props.rfc, props.hasTrailingColon))
</script>