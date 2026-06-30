<template>
  <nav aria-label="Breadcrumbs">
    <ul :class="['block mt-1 mb-2 pl-3 pr-14 leading-[1.5] print:hidden', props.class]">
      <li v-for="(item, index) in items" :key="index" class="inline">
        <Anchor
          v-if="item.url"
          class="inline pl-2 -ml-2 pr-2 py-2 underline rounded hover:bg-gray-200 hover:text-blue-800"
          :href="item.url"
          :aria-current="item.ariaCurrent"
          :aria-label="item.ariaLabel">
          {{ item.label }}
        </Anchor>
        <b
          v-else
          class="inline px-2 py-2 text-gray-700 dark:text-gray-300"
          :aria-current="item.ariaCurrent"
          :aria-label="item.ariaLabel">
          {{ item.label }}
        </b>
        <template v-if="index < items.length - 1">
          <GraphicsChevron class="inline-block -rotate-90 text-gray-300" width="14" height="18" />
        </template>
      </li>
    </ul>
  </nav>
</template>

<script setup lang="ts">
import type { BreadcrumbItem } from './BreadcrumbsTypes'
import type { VueStyleClass } from '~/utilities/vue'

type Props = {
  breadcrumbItems: BreadcrumbItem[]
  class?: VueStyleClass
}

const props = defineProps<Props>()

const items = computed(() => {
  const { breadcrumbItems } = props
  return breadcrumbItems.map((item, index) => ({
    ...item,
    ariaCurrent: index === breadcrumbItems.length - 1 ? ('page' as const) : undefined
  }))
})
</script>
