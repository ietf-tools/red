<template>
    <span v-if="props.rfc.subseries && props.rfc.subseries.length > 0">
        <span>: </span>
        <component :is="subseriesVNode" />
    </span>
</template>

<script setup lang="ts">
import { NuxtLink } from '#components'
import { formatTitleAsVNode } from '~/utilities/rfc'
import type { RfcCommon } from '~/utilities/rfc-validators'
import { infoRfcPathBuilder } from '~/utilities/url'

type Props = {
  rfc: RfcCommon
}

const props = defineProps<Props>()
const subseriesVNode = computed(() => formatSubseriesAsVNode(props.rfc.subseries))

const formatSubseriesAsVNode = (
  subseries: RfcCommon['subseries'] | undefined
): VNode => {
  if (!subseries) {
    return h('span')
  }

  return h(
    'span',
    subseries
      .map((subseries) =>
        h(
          NuxtLink,
          {
            to: infoRfcPathBuilder(
              `${subseries.type.toLowerCase()}${subseries.number}`
            ),
            class:
              'relative z-50 no-underline hover:underline focus:underline px-2 py-3 rounded text-gray-700 dark:text-gray-300',
            title:
              `RFC${props.rfc.number} is part of ${subseries.type.toUpperCase()}${subseries.number}`
          },
          () => formatTitleAsVNode(`${subseries.type}${subseries.number}`)
        )
      )
      .reduce((acc, item, index, arr) => {
        acc.push(item)
        if (index < arr.length - 1) {
          acc.push(h('span', ', '))
        }
        return acc
      }, [] as VNode[])
  )
}
</script>