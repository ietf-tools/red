<template>
  <slot />
  <TableOfContentsSection
    v-if="props.toc.sections"
    :sections="props.toc.sections"
    :list-type-element="listTypeElement"
    :depth="0"
    :list-class="props.listClass"
    :nested-list-class="props.nestedListClass"
    :list-item-class="props.listItemClass"
    :show-last-link-icon="props.showLastLinkIcon"
  />
</template>

<script setup lang="ts">
/**
 * Table of Contents
 *
 * See also TableOfContentsHighlight.vue
 */
import type { RfcEditorToc } from '../utilities/tableOfContents'

type Props = {
  toc: RfcEditorToc
  listType: 'numbered' | 'ordered'
  listClass?: string
  nestedListClass?: string
  listItemClass?: string
  showLastLinkIcon?: boolean
}

const props = defineProps<Props>()

const listTypeElement = computed(() =>
  props.listType === 'numbered' ? 'ol' : 'ul'
)
</script>
