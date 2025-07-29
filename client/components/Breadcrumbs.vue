<template>
  <ul :class="['block mt-1 mb-1 px-1 xs:px-0', props.class]">
    <li
      v-for="(path, index) in props.breadcrumbItems"
      :key="index"
      class="inline-block"
    >
      <A
        v-if="path.url"
        class="inline-block px-2 py-2 underline rounded hover:bg-gray-200 hover:text-blue-800"
        :href="path.url"
      >
        {{ path.label }}
      </A>
      <b
        v-else
        class="inline-block px-2 py-2 text-gray-700 dark:text-gray-300"
      >
        {{ path.label }}
      </b>
      <template v-if="index >= 0 && index < props.breadcrumbItems.length - 1">
        <GraphicsChevron
          class="inline-block -rotate-90 text-gray-300"
          width="14"
          height="18"
        />
      </template>
    </li>
  </ul>
</template>

<script setup lang="ts">
import type { BreadcrumbItem } from './BreadcrumbsTypes'
import type { VueStyleClass } from '~/utilities/vue'

type Props = {
  breadcrumbItems: BreadcrumbItem[]
  class?: VueStyleClass
}

const props = defineProps<Props>()
</script>
