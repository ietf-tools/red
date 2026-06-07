<template>
  <nav aria-label="Breadcrumb">
    <ul :class="['block mt-1 mb-1 px-1 xs:px-0 print:hidden', props.class]">
      <li
        v-for="(item, index) in items"
        :key="index"
        class="inline-block"
      >
        <Anchor
          v-if="item.url"
          class="inline-block px-2 py-2 underline rounded hover:bg-gray-200 hover:text-blue-800"
          :href="item.url"
          :aria-current="item.ariaCurrent"
        >
          {{ item.label }}
        </Anchor>
        <b
          v-else
          class="inline-block px-2 py-2 text-gray-700 dark:text-gray-300"
          :aria-current="item.ariaCurrent"
        >
          {{ item.label }}
        </b>
        <template v-if="index < items.length - 1">
          <GraphicsChevron
            class="inline-block -rotate-90 text-gray-300"
            width="14"
            height="18"
          />
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
    ariaCurrent: index === breadcrumbItems.length - 1 ? ('page' as const) : undefined,
  }))
})
</script>
