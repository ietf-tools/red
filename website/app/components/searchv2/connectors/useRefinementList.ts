import { computed, onScopeDispose, ref, shallowRef } from 'vue'
import { useSearchContext } from '../core/context'
import { debounce } from '../utils/debounce'
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
  /** Debounce before a keystroke in the facet search box hits the network. */
  searchDebounceMs?: number
  sortBy?: (a: RefinementItem, b: RefinementItem) => number
}

const DEFAULT_SEARCH_DEBOUNCE_MS = 200

/**
 * Multi-select facet. Optionally searchable (via the separate search-for-facet-values
 * channel, which never touches the main results) and expandable (show more/less).
 */
export function useRefinementList(options: UseRefinementListOptions) {
  const context = useSearchContext()
  const {
    attribute,
    limit = 10,
    showMoreLimit,
    showMore = false,
    searchable = false,
    searchDebounceMs = DEFAULT_SEARCH_DEBOUNCE_MS,
    sortBy
  } = options

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
  const searchError = shallowRef<unknown>(null)

  const selected = computed(() => context.uiState.value.refinements?.[attribute] ?? [])
  const facetCounts = computed(() => context.results.value?.facets?.[attribute] ?? {})
  const isTruncated = computed(() => context.results.value?.facetTruncated?.[attribute] ?? false)

  // A truncated list hides values behind the facet cap, so its search box is the only way to
  // reach them: it searches even when the host did not ask for `searchable`. Rendering the box
  // and honouring it are the same condition, so a shown box is never inert.
  const canSearch = computed(() => searchable || isTruncated.value)
  const isSearching = computed(() => canSearch.value && searchQuery.value.length > 0)

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

  // Bumped for every dispatched (or abandoned) facet search, so a slow response that lands
  // after a newer keystroke — or after the box was cleared — is dropped instead of replacing
  // a fresher list.
  let latestSeq = 0

  const runSearch = async (query: string) => {
    const seq = ++latestSeq
    try {
      const hits = await context.searchForFacetValues({ attribute, query, maxFacetHits: showMoreLimit ?? limit })
      if (seq !== latestSeq) return
      searchError.value = null
      searchHits.value = hits.map((hit) => ({
        value: hit.value,
        label: hit.value,
        count: hit.count,
        isRefined: selected.value.includes(hit.value),
        highlighted: hit.highlighted
      }))
    } catch (caught) {
      if (seq !== latestSeq) return
      searchError.value = caught
      searchHits.value = []
    }
  }

  const debouncedSearch = debounce((query: string) => void runSearch(query), searchDebounceMs)

  const clearSearchResults = () => {
    debouncedSearch.cancel()
    latestSeq += 1 // discard whatever is in flight
    searchHits.value = []
    searchError.value = null
  }

  const searchForItems = (query: string) => {
    searchQuery.value = query
    if (!query) {
      clearSearchResults()
      return
    }
    debouncedSearch(query)
  }

  onScopeDispose(() => debouncedSearch.cancel())

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
    clearSearchResults()
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
    canSearch,
    searchQuery,
    isSearching,
    searchError,
    searchForItems,
    refine
  }
}

function defaultSort(a: RefinementItem, b: RefinementItem): number {
  if (a.isRefined !== b.isRefined) return a.isRefined ? -1 : 1
  if (a.count !== b.count) return b.count - a.count
  return a.value.localeCompare(b.value)
}
