<template>
  <!-- Nested lists rather than one flat list with indentation classes: the nesting is what tells a
     screen reader that these subjects sit inside the one above, and it is the only thing that says
     so, since the indent is a margin and a margin says nothing. Recursion stops on its own, because
     ~/utilities/subject-tree has already cut the tree off at the depth it is willing to draw. -->
  <ul :class="depth === 1 ? '' : 'ml-6 border-l-1 border-gray-300 dark:border-gray-600 pl-4'">
    <li v-for="node in nodes" :key="node.slug" class="pt-1">
      <Anchor :href="subjectsPathBuilder(node.slug)" :class="ANCHOR_COLOR_TAILWIND_STYLE">{{ node.name }}</Anchor>
      <!-- A count is what a reader picks a subject by, so it goes beside the name rather than
         behind the description that density can take away. -->
      <span class="text-sm text-gray-700 dark:text-gray-300 ml-2">{{ countLabel(node) }}</span>
      <p v-if="node.description && density === 'full'" class="inline">: {{ node.description }}</p>
      <SubjectTreeList v-if="node.children.length > 0" :nodes="node.children" :density="density" />
    </li>
  </ul>
</template>

<script setup lang="ts">
import type { SubjectDensity } from '~/stores/ui-settings'
import type { SubjectNode } from '~/utilities/subject-tree'
import { ANCHOR_COLOR_TAILWIND_STYLE } from '~/utilities/theme'
import { subjectsPathBuilder } from '~/utilities/url'

const { nodes, density } = defineProps<{
  nodes: SubjectNode[]
  density: SubjectDensity
}>()

// Read off the first node rather than passed in, so a caller cannot say a depth the tree disagrees
// with. Every node in one list is at the same depth, and an empty list draws nothing anyway.
const depth = computed(() => nodes[0]?.depth ?? 1)

// A subject with subjects beneath it is asked about as a whole — "what is there on security" is
// answered by the subtree, not by the handful of documents filed at the top of it. A leaf has no
// subtree, so the two counts are the same number and only one of them is worth the space.
const countLabel = ({ children, document_count, document_count_deep }: SubjectNode): string => {
  const count = children.length > 0 ? document_count_deep : document_count
  return count === 1 ? '1 RFC' : `${count} RFCs`
}
</script>
