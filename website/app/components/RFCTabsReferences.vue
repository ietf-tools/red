<template>
  <ul class="flex flex-col gap-2 leading-[1.75]">
    <li v-for="(rfc, rfcIndex) in sortedRfcReferences" :key="rfcIndex">
      <Anchor :href="infoSeriesPathBuilder(`rfc${rfc.number}`)" :class="ANCHOR_COLOR_TAILWIND_STYLE" side="left">
        <RFCTitle :rfc="rfc" />
      </Anchor>
    </li>
  </ul>
</template>

<script setup lang="ts">
import { ANCHOR_COLOR_TAILWIND_STYLE } from '~/utilities/theme'
import { infoSeriesPathBuilder } from '~/utilities/url'

type RfcReferences = {
  title: string
  number: number
}[]

type Props = {
  rfcs: RfcReferences
}

const props = defineProps<Props>()

const sortedRfcReferences = computed(() => Array.from(props.rfcs).sort((a, b) => a.number - b.number))
</script>
