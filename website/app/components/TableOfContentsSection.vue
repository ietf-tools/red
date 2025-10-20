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
      <div
        v-if="section.links"
        class="flex flex-row gap-2"
      >
        <a
          v-for="(link, linkIndex) in section.links"
          :key="linkIndex"
          :href="`#${link.id}`"
          :class="[props.listItemClass, 'flex flex-row']"
          @click="handleCloseModalAndScrollToId ? handleCloseModalAndScrollToId(link.id) : undefined"
        >
          <span class="grow-1">{{ link.title }}</span>
          <GraphicsChevron
            v-if="linkIndex === section.links.length - 1 && props.showLastLinkIcon"
            class="shrink-0 grow-0 basis-5 w-1.5 h-1.5 text-blue-100 group-hover:text-white ml-1 translate-y-1.5 -rotate-90"
          />
        </a>
      </div>

      <TableOfContentsSection
        v-if="section.sections"
        :sections="section.sections"
        :list-type-element="listTypeElement"
        :depth="props.depth + 1"
        :list-class="props.listClass"
        :nested-list-class="props.nestedListClass"
        :list-item-class="props.listItemClass"
        :show-last-link-icon="props.showLastLinkIcon"
      />
    </li>
  </component>
</template>

<script setup lang="ts">
import { closeModalAndScrollToId, type RfcEditorToc } from '../utilities/tableOfContents'

type Sections = RfcEditorToc['sections']

type Props = {
  sections: Sections
  listTypeElement: 'ol' | 'ul'
  depth: number
  listClass?: string
  nestedListClass?: string
  listItemClass?: string
  showLastLinkIcon?: boolean
}

const props = defineProps<Props>()

const handleCloseModalAndScrollToId = inject(closeModalAndScrollToId)
</script>
