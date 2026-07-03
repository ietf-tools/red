<template>
  <component
    :is="landmark ? 'nav' : 'div'"
    v-if="nbPages > 1"
    :class="classNames?.root"
    :aria-label="landmark ? ariaLabel : undefined">
    <ul :class="classNames?.list">
      <li v-if="!isFirstPage" :class="classNames?.item">
        <component
          :is="tagFor(0)"
          v-bind="attrsFor(0)"
          :class="classNames?.link"
          :aria-label="firstLabel"
          @click="navigate(0, $event)">
          <slot name="first">‹‹</slot>
        </component>
      </li>
      <li v-if="!isFirstPage" :class="classNames?.item">
        <component
          :is="tagFor(currentPage - 1)"
          v-bind="attrsFor(currentPage - 1)"
          :class="classNames?.link"
          :aria-label="previousLabel"
          @click="navigate(currentPage - 1, $event)">
          <slot name="previous">‹</slot>
        </component>
      </li>
      <li v-for="page in pages" :key="page" :class="classNames?.item">
        <component
          :is="tagFor(page)"
          v-bind="attrsFor(page)"
          :class="[classNames?.link, page === currentPage ? classNames?.linkSelected : undefined]"
          :aria-label="`${pageLabel} ${page + 1}`"
          :aria-current="page === currentPage ? 'page' : undefined"
          @click="navigate(page, $event)">
          {{ page + 1 }}
        </component>
      </li>
      <li v-if="!isLastPage" :class="classNames?.item">
        <component
          :is="tagFor(currentPage + 1)"
          v-bind="attrsFor(currentPage + 1)"
          :class="classNames?.link"
          :aria-label="nextLabel"
          @click="navigate(currentPage + 1, $event)">
          <slot name="next">›</slot>
        </component>
      </li>
      <li v-if="!isLastPage" :class="classNames?.item">
        <component
          :is="tagFor(nbPages - 1)"
          v-bind="attrsFor(nbPages - 1)"
          :class="classNames?.link"
          :aria-label="lastLabel"
          @click="navigate(nbPages - 1, $event)">
          <slot name="last">››</slot>
        </component>
      </li>
    </ul>
  </component>
</template>

<script setup lang="ts">
import { usePagination } from '../connectors/usePagination'
import type { ClassNames } from '../types'

type Props = {
  classNames?: ClassNames
  padding?: number
  ariaLabel?: string
  pageLabel?: string
  firstLabel?: string
  previousLabel?: string
  nextLabel?: string
  lastLabel?: string
  /** Called after an in-app navigation, e.g. to scroll up and move focus to results. */
  onNavigate?: () => void
  /**
   * Expose the container as a `navigation` landmark (`<nav>`). Default true; set false
   * when the host already provides an enclosing landmark, to avoid duplicate landmarks.
   */
  landmark?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  classNames: undefined,
  padding: 3,
  ariaLabel: 'Pagination',
  pageLabel: 'Page',
  firstLabel: 'First page',
  previousLabel: 'Previous page',
  nextLabel: 'Next page',
  lastLabel: 'Last page',
  onNavigate: undefined,
  landmark: true
})

const { currentPage, nbPages, isFirstPage, isLastPage, pages, refine, createURL } = usePagination({
  padding: props.padding
})

const tagFor = (page: number) => (createURL(page) === undefined ? 'button' : 'a')

const attrsFor = (page: number) => {
  const href = createURL(page)
  return href === undefined ? { type: 'button' } : { href }
}

const navigate = (page: number, event: MouseEvent) => {
  // Let the browser handle modified / middle clicks on real links (open in new tab, etc.).
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return
  event.preventDefault()
  refine(page)
  props.onNavigate?.()
}
</script>
