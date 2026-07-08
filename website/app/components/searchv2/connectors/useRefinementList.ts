import { computed, onScopeDispose, ref } from 'vue'
import { useSearchContext } from '../core/context'
import type { SearchRequest } from '../types'

export type RefinementItem = {
  value: string
  label: string
  count: number
  isRefined: boolean
  highlighted?: string
}

export type UseRefinementListOptions = {
  attribute: string
  limit?: number
  showMoreLimit?: number
  showMore?: boolean
  searchable?: boolean
  sortBy?: (a: RefinementItem, b: RefinementItem) => number
}

/**
 * Multi-select facet. Optionally searchable (via the separate search-for-facet-values
 * channel, which never touches the main results) and expandable (show more/less).
 */
export function useRefinementList(options: UseRefinementListOptions) {
  const context = useSearchContext()
  const { attribute, limit = 10, showMoreLimit, showMore = false, searchable = false, sortBy } = options

  onScopeDispose(
    context.registerWidget({
      id: `refinementList:${attribute}`,
      getSearchParameters: (request: SearchRequest) => {
        request.facets.push(attribute)
        return request
      }
    })
  )

  const isShowingMore = ref(false)
  const searchQuery = ref('')
  const searchHits = ref<RefinementItem[]>([])
  const isSearching = computed(() => searchable && searchQuery.value.length > 0)

  const selected = computed(() => context.uiState.value.refinements?.[attribute] ?? [])
  const facetCounts = computed(() => context.results.value?.facets?.[attribute] ?? {})
  const isTruncated = computed(() => context.results.value?.facetTruncated?.[attribute] ?? false)

  const allItems = computed<RefinementItem[]>(() => {
    const counts = facetCounts.value
    const values = new Set<string>([...Object.keys(counts), ...selected.value])
    const items = [...values].map((value) => ({
      value,
      label: value,
      count: counts[value] ?? 0,
      isRefined: selected.value.includes(value)
    }))
    return items.sort(sortBy ?? defaultSort)
  })

  const currentLimit = computed(() => (isShowingMore.value ? (showMoreLimit ?? limit) : limit))

  const items = computed<RefinementItem[]>(() =>
    isSearching.value ? searchHits.value : allItems.value.slice(0, currentLimit.value)
  )

  const canToggleShowMore = computed(
    () => showMore && !isSearching.value && (isShowingMore.value || allItems.value.length > limit)
  )

  const toggleShowMore = () => {
    if (canToggleShowMore.value || isShowingMore.value) isShowingMore.value = !isShowingMore.value
  }

  const searchForItems = async (query: string) => {
    searchQuery.value = query
    if (!query) {
      searchHits.value = []
      return
    }
    const hits = await context.searchForFacetValues({ attribute, query, maxFacetHits: showMoreLimit ?? limit })
    searchHits.value = hits.map((hit) => ({
      value: hit.value,
      label: hit.value,
      count: hit.count,
      isRefined: selected.value.includes(hit.value),
      highlighted: hit.highlighted
    }))
  }

  const refine = (value: string) => {
    const current = context.uiState.value.refinements?.[attribute] ?? []
    const next = current.includes(value) ? current.filter((item) => item !== value) : [...current, value]
    context.setUiState((previous) => {
      const refinements = { ...previous.refinements }
      if (next.length) refinements[attribute] = next
      else delete refinements[attribute]
      return { ...previous, refinements, page: 0 }
    })
    searchQuery.value = ''
    searchHits.value = []
  }

  return {
    attribute,
    items,
    selected,
    isShowingMore,
    canToggleShowMore,
    toggleShowMore,
    isTruncated,
    searchable,
    searchQuery,
    isSearching,
    searchForItems,
    refine
  }
}

function defaultSort(a: RefinementItem, b: RefinementItem): number {
  if (a.isRefined !== b.isRefined) return a.isRefined ? -1 : 1
  if (a.count !== b.count) return b.count - a.count
  return a.value.localeCompare(b.value)
}
