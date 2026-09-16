<template>
  <!-- Nested lists rather than one flat list with indentation classes: the nesting is what tells a
     screen reader that these subjects sit inside the one above, and it is the only thing that says
     so, since the indent is a margin and a margin says nothing. Recursion stops on its own, because
     ~/utilities/subject-tree has already cut the tree off at the depth it is willing to draw.

     Deliberately not role="tree". These are links in a document, and tree semantics would make the
     whole list one tab stop that has to be walked with the arrow keys. -->
  <ul :class="depth === 1 ? '' : 'ml-6 border-l-1 border-gray-300 dark:border-gray-600 pl-4'">
    <li v-for="node in nodes" :key="node.slug" class="pt-1">
      <Anchor :href="subjectsPathBuilder(node.slug)" :class="ANCHOR_COLOR_TAILWIND_STYLE">
        <HighlightedText :text="node.name" :ranges="matches.get(node.slug)?.nameRanges ?? []" />
      </Anchor>
      <!-- Which rows the reader's words actually reached. The highlight says it on screen, and
         `mark` is not reliably announced, so the same thing is said again for anyone listening.
         Outside the link rather than inside it, so that the link's accessible name stays exactly
         its visible text — which is what a voice-control user says to follow it. -->
      <span v-if="isMatch(node)" class="sr-only"> matches the filter</span>
      <!-- A count is what a reader picks a subject by, so it goes beside the name rather than
         behind the description that density can take away. -->
      <span class="text-sm text-gray-700 dark:text-gray-300 ml-2">{{ countLabel(node) }}</span>
      <p v-if="descriptionOf(node)" class="inline">
        : <HighlightedText :text="node.description" :ranges="matches.get(node.slug)?.descriptionRanges ?? []" />
      </p>
      <SubjectTreeList v-if="node.children.length > 0" :nodes="node.children" :density="density" :matches="matches" />
    </li>
  </ul>
</template>

<script setup lang="ts">
import type { SubjectDensity } from '~/stores/ui-settings'
import type { SubjectMatch } from '~/utilities/subject-search'
import type { SubjectNode } from '~/utilities/subject-tree'
import { ANCHOR_COLOR_TAILWIND_STYLE } from '~/utilities/theme'
import { subjectsPathBuilder } from '~/utilities/url'

const { nodes, density, matches } = defineProps<{
  nodes: SubjectNode[]
  density: SubjectDensity
  /**
   * Where the filter's terms were found, by slug. A subject that is absent is on the page as a step
   * on the way to one that matched, rather than because the reader asked for it; an empty map is an
   * unfiltered page, where nothing is a match and nothing is context.
   */
  matches: Map<string, SubjectMatch>
}>()

// Read off the first node rather than passed in, so a caller cannot say a depth the tree disagrees
// with. Every node in one list is at the same depth, and an empty list draws nothing anyway.
const depth = computed(() => nodes[0]?.depth ?? 1)

const isMatch = ({ slug }: SubjectNode): boolean => matches.has(slug)

/**
 * The description to draw beneath this subject, if any.
 *
 * The compact density is a preference about the page at rest, and it hides descriptions. A subject
 * the filter reached through its description and not its name has all of its evidence in there, so
 * the compact page reveals that one description rather than drawing a row with no visible reason to
 * be on the page — which is exactly how a subject shown only for context looks.
 */
const descriptionOf = (node: SubjectNode): string | undefined => {
  if (!node.description) return undefined
  if (density === 'full') return node.description

  const match = matches.get(node.slug)
  const matchedInDescriptionOnly =
    match !== undefined && match.nameRanges.length === 0 && match.descriptionRanges.length > 0

  return matchedInDescriptionOnly ? node.description : undefined
}

// A subject with subjects beneath it is asked about as a whole — "what is there on security" is
// answered by the subtree, not by the handful of documents filed at the top of it. A leaf has no
// subtree, so the two counts are the same number and only one of them is worth the space.
const countLabel = ({ children, document_count, document_count_deep }: SubjectNode): string => {
  const count = children.length > 0 ? document_count_deep : document_count
  return count === 1 ? '1 RFC' : `${count} RFCs`
}
</script>
