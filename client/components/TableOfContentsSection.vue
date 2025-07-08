<template>
  <component
    :is="listTypeElement"
    :class="[
      props.depth === 0 && props.listClass,
      props.depth >= 1 && props.nestedListClass
    ]"
  >
    <li
      v-for="(section, index) in props.sections"
      :key="index"
    >
      <a
        v-for="(link, linkIndex) in section.links"
        :key="linkIndex"
        :to="`#${link.id}`"
        :class="[props.listItemClass, 'flex flex-row']"
      >
        <span class="grow-1">{{ link.title }}</span>
        <GraphicsChevron
          class="shrink-0 grow-0 basis-5 w-1.5 h-1.5 text-blue-100 group-hover:text-white ml-1 translate-y-1.5 -rotate-90"
        />
      </a>

      <TableOfContentsSection
        v-if="section.sections"
        :sections="section.sections"
        :list-type-element="listTypeElement"
        :depth="props.depth + 1"
        :list-class="props.listClass"
        :nested-list-class="props.nestedListClass"
        :list-item-class="props.listItemClass"
      />
    </li>
  </component>
</template>

<script setup lang="ts">
import type { RfcEditorToc } from '../utilities/tableOfContents'

type Sections = RfcEditorToc['sections']

type Props = {
  sections: Sections
  listTypeElement: 'ol' | 'ul'
  depth: number
  listClass?: string
  nestedListClass?: string
  listItemClass?: string
}

const props = defineProps<Props>()
</script>
