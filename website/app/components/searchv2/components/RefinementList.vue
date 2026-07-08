<template>
  <Fieldset :legend="label" :legend-class="classNames?.legend" :class="classNames?.root">
    <p v-if="description" :id="descriptionId" :class="classNames?.description">{{ description }}</p>

    <div v-if="searchable || isTruncated" :class="classNames?.searchBox">
      <label :for="searchDomId" :class="classNames?.searchLabel">{{ searchLabel }}</label>
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
            :aria-describedby="description ? descriptionId : undefined"
            @change="onToggle(item.value)" />
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

    <p v-if="isTruncated && isShowingMore && !isSearching && truncatedLabel" :class="classNames?.truncated">
      <slot name="truncated">{{ truncatedLabel }}</slot>
    </p>

    <LiveRegion :visible="false" :message="announcement" />
  </Fieldset>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, useId, watch } from 'vue'
import Fieldset from '../a11y/Fieldset.vue'
import LiveRegion from '../a11y/LiveRegion.vue'
import { useFocusManagement } from '../a11y/useFocusManagement'
import { useRefinementList, type RefinementItem } from '../connectors/useRefinementList'
import { SR_ONLY_STYLE } from '../utils/srOnly'
import type { ClassNames } from '../types'

type Props = {
  attribute: string
  label: string
  /** Supplementary text linked to each option's checkbox via `aria-describedby`. */
  description?: string
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
  /** Hint shown when the facet list was capped and more values exist. Set to `''` to hide it. */
  truncatedLabel?: string
  /** Builds the settled "N options available" live-region message; override for wording/localisation. */
  availableMessage?: (count: number) => string
  sortBy?: (a: RefinementItem, b: RefinementItem) => number
}

const props = withDefaults(defineProps<Props>(), {
  description: undefined,
  classNames: undefined,
  limit: 10,
  showMoreLimit: undefined,
  showMore: false,
  searchable: false,
  searchLabel: undefined,
  searchPlaceholder: '',
  showMoreLabel: 'Show more',
  showLessLabel: 'Show less',
  showMoreAriaLabel: undefined,
  showLessAriaLabel: undefined,
  emptyLabel: 'No options available.',
  noResultsLabel: 'No matches.',
  truncatedLabel: 'There may be more choices available. Use the search above to refine this list',
  availableMessage: undefined,
  sortBy: undefined
})

const searchDomId = useId()
const descriptionId = useId()
const listRef = ref<HTMLElement | null>(null)
const toggleRef = ref<HTMLElement | null>(null)
const { focusElement } = useFocusManagement()

const {
  items,
  isShowingMore,
  canToggleShowMore,
  toggleShowMore,
  isTruncated,
  searchQuery,
  isSearching,
  searchForItems,
  refine
} = useRefinementList({
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

// Toggling a checkbox reruns the search, which can remove the focused option from the
// list (its count drops out). Vue's keyed reuse keeps focus when the option survives;
// this guard is the safety net for when it doesn't, so focus never falls to <body>
// (WCAG 2.4.3 Focus Order). It is a no-op whenever focus is preserved or the user has
// moved focus elsewhere.
const pendingFocusValue = ref<string | null>(null)
let clearPendingTimer: ReturnType<typeof setTimeout> | undefined

const onToggle = (value: string) => {
  pendingFocusValue.value = value
  refine(value)
  if (clearPendingTimer !== undefined) clearTimeout(clearPendingTimer)
  clearPendingTimer = setTimeout(() => {
    pendingFocusValue.value = null
  }, 1500)
}

watch(items, async () => {
  if (pendingFocusValue.value === null) return
  await nextTick()
  const list = listRef.value
  const active = document.activeElement
  // Only intervene when focus was actually lost (dropped to <body>), never steal it back
  // if the user has moved on to another control.
  if (!list || (active !== null && active !== document.body)) return
  const value = pendingFocusValue.value
  const checkboxes = [...list.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')]
  const target = checkboxes.find((checkbox) => checkbox.value === value) ?? checkboxes[0] ?? toggleRef.value
  target?.focus()
  pendingFocusValue.value = null
})

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
