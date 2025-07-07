<template>
  <component
    :is="props.listTypeElement"
    :class="[
      props.depth === 0 && props.listClass,
      props.depth >= 1 && props.nestedListClass
    ]"
  >
    <li
      v-for="(section, index) in props.sections"
      :key="index"
    >
      <div :class="[
        'flex flex-row gap-2',
        props.linksClass,
        section.links.some(link => activeId === link.id) && props.linksActiveClass,
      ]">
        <a
          v-for="(link, linkIndex) in section.links"
          :id="makeTocId(link.id)"
          :key="linkIndex"
          :href="`#${link.id}`"
          :aria-current="link.id === props.activeId"
          :class="[
            props.linkClass,
            linkIndex === section.links.length - 1 ? props.lastLinkClass : undefined
          ]"
          @click="handleClick(link.id)"
        >
          {{ link.title }}
          <GraphicsChevron
            v-if="linkIndex === section.links.length - 1 && props.showLastLinkIcon"
            class="shrink-0 grow-0 basis-5 w-1.5 h-1.5 text-blue-100 group-hover:text-white ml-1 translate-y-1.5 -rotate-90"
          />
        </a>
      </div>

      <TableOfContentsHighlightSection
        v-if="section.sections"
        :sections="section.sections"
        :list-type-element="listTypeElement"
        :depth="props.depth + 1"
        :active-id="props.activeId"
        :handle-click="props.handleClick"
        :make-toc-id="props.makeTocId"
        :is-ssr="props.isSsr"
        :list-class="props.listClass"
        :nested-list-class="props.nestedListClass"
        :links-class="props.linksClass"
        :links-active-class="props.linksActiveClass"
        :link-class="props.linkClass"
        :last-link-class="props.lastLinkClass"
        :show-last-link-icon="props.showLastLinkIcon"
      />
    </li>
  </component>
</template>

<script setup lang="ts">
/**
 * Table of Contents that highlights titles that are in the viewport
 */

import type { RfcEditorToc } from '../utilities/tableOfContents'

type Sections = RfcEditorToc['sections']

type Props = {
  sections: Sections
  listTypeElement: 'ol' | 'ul'
  depth: number
  activeId: string
  handleClick: (id: string) => void
  makeTocId: (id: string) => string
  isSsr: boolean
  listClass?: string
  nestedListClass?: string
  linksClass?: string
  linksActiveClass?: string
  linkClass?: string
  lastLinkClass?: string
  showLastLinkIcon?: boolean
}

const props = defineProps<Props>()
</script>
