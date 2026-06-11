<template>
  <component :is="formattedTitle" />
</template>

<script setup lang="ts">
import type { SeriesId } from '~/utilities/rfc'
import { formatTitleAsVNode } from '~/utilities/rfc-title'

type Props = {
  series?: SeriesId
}

const props = defineProps<Props>()

const formattedTitle = computed(() => {
  if (!props.series) {
    return undefined
  }
  return formatTitleAsVNode(`${props.series.type}${props.series.number}`, false)
})
</script>
