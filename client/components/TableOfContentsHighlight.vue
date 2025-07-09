<template>
  <VerticalScrollable
    v-if="props"
    ref="vertical-scrollable"
    :class="`overflow-y-auto min-h-0 flex flex-col ${props.wrapperClass}`"
  >
    <slot />
    <TableOfContentsHighlightSection
      v-if="props.toc.sections"
      :sections="props.toc.sections"
      :depth="0"
      :list-type-element="listTypeElement"
      :active-id="activeId"
      :handle-click="handleClick"
      :make-toc-id="makeTocId"
      :is-ssr="isSSR"
      :list-class="props.listClass"
      :nested-list-class="props.nestedListClass"
      :links-class="props.linksClass"
      :links-active-class="props.linksActiveClass"
      :link-class="props.linkClass"
      :last-link-class="props.lastLinkClass"
      :show-last-link-icon="props.showLastLinkIcon"
    />
  </VerticalScrollable>
</template>

<script setup lang="ts">
/**
 * Table of Contents that highlights titles that are in the browser viewport
 */
import {
  useTocActiveId,
  useScrollTocContainer,
  useValidateIds
} from '../utilities/scroll'
import type { RfcEditorToc } from '../utilities/tableOfContents'

type Section = RfcEditorToc['sections'][number]

type Props = {
  toc: RfcEditorToc
  listType: 'numbered' | 'ordered'
  wrapperClass?: string
  listClass?: string
  nestedListClass?: string
  linksClass?: string
  linksActiveClass?: string
  linkClass?: string
  lastLinkClass?: string
  showLastLinkIcon?: boolean
}

const props = defineProps<Props>()

const listTypeElement = computed(() =>
  props.listType === 'numbered' ? 'ol' : 'ul'
)

const verticalScrollableRef = useTemplateRef('vertical-scrollable')

const wrapperRef = computed(() => {
  const { value } = verticalScrollableRef
  if (value && typeof value === 'object' && "scrollContainer" in value && value.scrollContainer instanceof HTMLElement) {
    return value.scrollContainer
  }
  return null
})

const flattenSectionLinkIds = (section: Section): string[] =>
  [...(section.links ?? []).map((link) => link.id)].concat(
    section.sections ? section.sections.flatMap(flattenSectionLinkIds) : []
  )

const ids = computed(() => props.toc.sections.flatMap(flattenSectionLinkIds))

if (
  // safety check in case there's a coding error
  // because if we pass non-strings to useActiveScroll then it will crash the page
  ids.value.some((id) => typeof id !== 'string')
) {
  const statusMessage = `Server error. Please try again later. Toc ids were not string. Was: ${JSON.stringify(ids.value.map((id) => typeof id))}`
  console.error(statusMessage)
  if (import.meta.dev) {
    throw createError({
      statusCode: 500,
      statusMessage,
      fatal: true
    })
  }
}

const { setActive: _setActive, activeId } = useTocActiveId(ids)

const handleClick = (id: string): void => {
  /**
   * After they click the `#id` link the page scrolls which recalculates the
   * activeId to something other than what they clicked, which means the wrong
   * TOC Link is highlighted and this is confusing UX.
   *
   * To fix this confusing UX we'll try to set the activeId a few times.
   * FIXME: This isn't great but it works.
   */
  _setActive(id)
  setTimeout(() => _setActive(id), 50)
  setTimeout(() => _setActive(id), 100)
  setTimeout(() => _setActive(id), 150)
}

useValidateIds(ids)

const makeTocId = (id: string) => `toc-${id}`

useScrollTocContainer({
  toActiveIdRef: activeId,
  wrapperRef,
  makeTocId
})

const isSSR = ref(true)
onMounted(() => {
  isSSR.value = false
})
</script>
