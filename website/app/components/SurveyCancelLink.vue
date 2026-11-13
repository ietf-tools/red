<template>
  <Anchor :href="href" :class="[ANCHOR_COLOR_TAILWIND_STYLE, 'inline-block px-1 py-2 text-base']">
    {{ item.title }}
  </Anchor>
</template>

<script setup lang="ts">
/**
 * Rendered by SurveyJS in its navigation bar (see SurveyRunner.client.vue) so that leaving the
 * survey is a real link, rather than a button that navigates.
 */
import type { Action } from 'survey-core'
import { ANCHOR_COLOR_TAILWIND_STYLE } from '~/utilities/theme'

const { item } = defineProps<{ item: Action }>()

const href = computed(() => {
  const { data } = item
  return typeof data === 'object' && data !== null && 'href' in data && typeof data.href === 'string' ? data.href : '/'
})
</script>
