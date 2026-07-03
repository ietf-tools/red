// Public entry point for the searchv2 library (core, backend-agnostic).
// The Typesense adapter is a separate entry: `searchv2/adapters/typesense`.

// Core
export { default as SearchRoot } from './core/SearchRoot.vue'
export { provideSearchContext, useSearchContext } from './core/context'
export { createInMemoryAdapter } from './core/inMemoryAdapter'
export { createSearchEngine } from './core/engine'
export type { SearchEngine, SearchEngineOptions } from './core/engine'

// Components
export { default as SearchBox } from './components/SearchBox.vue'
export { default as Stats } from './components/Stats.vue'
export { default as Hits } from './components/Hits.vue'
export { default as Pagination } from './components/Pagination.vue'
export { default as HitsPerPage } from './components/HitsPerPage.vue'
export { default as SortBy } from './components/SortBy.vue'
export { default as RefinementList } from './components/RefinementList.vue'
export { default as Select } from './components/Select.vue'
export { default as RangeInput } from './components/RangeInput.vue'
export { default as YearMonthRangeInput } from './components/YearMonthRangeInput.vue'
export { default as ToggleRefinement } from './components/ToggleRefinement.vue'
export { default as ResetForm } from './components/ResetForm.vue'
export { default as Highlight } from './components/Highlight.vue'

// Accessibility primitives
export { default as LiveRegion } from './a11y/LiveRegion.vue'
export { default as Fieldset } from './a11y/Fieldset.vue'
export { useFocusManagement } from './a11y/useFocusManagement'

// Connectors (headless)
export { useSearchBox } from './connectors/useSearchBox'
export { useStats } from './connectors/useStats'
export { useHits } from './connectors/useHits'
export { usePagination } from './connectors/usePagination'
export { useHitsPerPage } from './connectors/useHitsPerPage'
export { useSortBy } from './connectors/useSortBy'
export { useRefinementList } from './connectors/useRefinementList'
export { useMenuSelect } from './connectors/useMenuSelect'
export { useRange } from './connectors/useRange'
export { useToggleRefinement } from './connectors/useToggleRefinement'
export { useResetForm } from './connectors/useResetForm'

export type { UseSearchBoxOptions } from './connectors/useSearchBox'
export type { HitsPerPageItem } from './connectors/useHitsPerPage'
export type { SortByItem } from './connectors/useSortBy'
export type { RefinementItem, UseRefinementListOptions } from './connectors/useRefinementList'
export type { MenuItem, UseMenuSelectOptions } from './connectors/useMenuSelect'

// Types
export type {
  ClassNames,
  FacetHit,
  NumericRange,
  SearchClient,
  SearchContext,
  SearchForFacetValuesRequest,
  SearchHit,
  SearchRequest,
  SearchResponse,
  SearchStatus,
  StateAdapter,
  UiState,
  Widget
} from './types'
