<template>
  <Fieldset :legend="label" :legend-class="classNames?.legend" :class="classNames?.root">
    <div v-if="searchable" :class="classNames?.searchBox">
      <label :for="searchDomId" :style="SR_ONLY_STYLE">{{ searchLabel }}</label>
      <input
        :id="searchDomId"
        type="search"
        :class="classNames?.searchInput"
        :placeholder="searchPlaceholder"
        :value="searchQuery"
        autocomplete="off"
        @input="onSearchInput" />
    </div>

    <ul ref="listRef" :class="classNames?.list">
      <li v-if="items.length === 0" :class="classNames?.noResults">
        <slot v-if="isSearching" name="no-results">{{ noResultsLabel }}</slot>
        <slot v-else name="empty">{{ emptyLabel }}</slot>
      </li>
      <li v-for="item in items" :key="item.value" :class="classNames?.item">
        <label :class="classNames?.itemLabel">
          <input
            type="checkbox"
            :class="classNames?.checkbox"
            :value="item.value"
            :checked="item.isRefined"
            @change="refine(item.value)" />
          <slot name="label" :item="item">
            <span v-if="item.highlighted" :class="classNames?.text" v-html="item.highlighted" />
            <span v-else :class="classNames?.text">{{ item.label }}</span>
          </slot>
          <span :class="classNames?.count">{{ item.count.toLocaleString() }}</span>
        </label>
      </li>
    </ul>

    <button
      v-if="canToggleShowMore"
      ref="toggleRef"
      type="button"
      :class="classNames?.showMore"
      :aria-label="isShowingMore ? showLessAriaLabel : showMoreAriaLabel"
      @click="onToggleShowMore">
      <slot name="show-more" :is-showing-more="isShowingMore">{{ isShowingMore ? showLessLabel : showMoreLabel }}</slot>
    </button>

    <LiveRegion :visible="false" :message="announcement" />
  </Fieldset>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, useId } from 'vue'
import Fieldset from '../a11y/Fieldset.vue'
import LiveRegion from '../a11y/LiveRegion.vue'
import { useFocusManagement } from '../a11y/useFocusManagement'
import { useRefinementList, type RefinementItem } from '../connectors/useRefinementList'
import { SR_ONLY_STYLE } from '../utils/srOnly'
import type { ClassNames } from '../types'

type Props = {
  attribute: string
  label: string
  classNames?: ClassNames
  limit?: number
  showMoreLimit?: number
  showMore?: boolean
  searchable?: boolean
  searchLabel?: string
  searchPlaceholder?: string
  showMoreLabel?: string
  showLessLabel?: string
  /** Accessible name for the toggle; defaults to `"<showMoreLabel> <label>"`. */
  showMoreAriaLabel?: string
  /** Accessible name for the toggle when expanded; defaults to `"<showLessLabel> <label>"`. */
  showLessAriaLabel?: string
  /** Message shown when the facet has no options (e.g. the current search has no results). */
  emptyLabel?: string
  /** Message shown when a facet-search (searchable list) returns no matching options. */
  noResultsLabel?: string
  /** Builds the settled "N options available" live-region message; override for wording/localisation. */
  availableMessage?: (count: number) => string
  sortBy?: (a: RefinementItem, b: RefinementItem) => number
}

const props = withDefaults(defineProps<Props>(), {
  classNames: undefined,
  limit: 10,
  showMoreLimit: undefined,
  showMore: false,
  searchable: false,
  searchLabel: undefined,
  searchPlaceholder: 'Search…',
  showMoreLabel: 'Show more',
  showLessLabel: 'Show less',
  showMoreAriaLabel: undefined,
  showLessAriaLabel: undefined,
  emptyLabel: 'No options available.',
  noResultsLabel: 'No matches.',
  availableMessage: undefined,
  sortBy: undefined
})

const searchDomId = useId()
const listRef = ref<HTMLElement | null>(null)
const toggleRef = ref<HTMLElement | null>(null)
const { focusElement } = useFocusManagement()

const { items, isShowingMore, canToggleShowMore, toggleShowMore, searchQuery, isSearching, searchForItems, refine } =
  useRefinementList({
    attribute: props.attribute,
    limit: props.limit,
    showMoreLimit: props.showMoreLimit,
    showMore: props.showMore,
    searchable: props.searchable,
    sortBy: props.sortBy
  })

// Defect #3/#4: descriptive, group-specific accessible names for the facet search and toggle.
const searchLabel = computed(() => props.searchLabel ?? `Search ${props.label.toLowerCase()}`)
const showMoreAriaLabel = computed(
  () => props.showMoreAriaLabel ?? `${props.showMoreLabel} ${props.label.toLowerCase()}`
)
const showLessAriaLabel = computed(
  () => props.showLessAriaLabel ?? `${props.showLessLabel} ${props.label.toLowerCase()}`
)

// Defect #3: announce a concise settled count while filtering, not every option.
const announcement = computed(() => {
  if (!isSearching.value) return ''
  const count = items.value.length
  if (props.availableMessage) return props.availableMessage(count)
  return `${count} ${props.label.toLowerCase()} ${count === 1 ? 'filter' : 'filters'} available`
})

const onSearchInput = (event: Event) => {
  if (event.target instanceof HTMLInputElement) void searchForItems(event.target.value)
}

// Defect #5: move focus to the first newly revealed option on expand; back to the toggle on collapse.
const onToggleShowMore = async () => {
  const wasShowingMore = isShowingMore.value
  toggleShowMore()
  await nextTick()
  if (!wasShowingMore) {
    const checkboxes = listRef.value?.querySelectorAll<HTMLElement>('input[type="checkbox"]')
    await focusElement(checkboxes?.[props.limit])
  } else {
    await focusElement(toggleRef.value)
  }
}
</script>
