import type { Ref, ShallowRef } from 'vue'

/**
 * Serializable UI state. This is the source of truth: it is what a StateAdapter
 * reads and writes (to the URL, in the Nuxt adapter). Widgets read from it and
 * refine by producing a new UiState via `setUiState`.
 */
export type UiState = {
  query?: string
  page?: number
  hitsPerPage?: number
  sortBy?: string
  /** multi-select facets: attribute -> selected values */
  refinements?: Record<string, string[]>
  /** single-select facets: attribute -> selected value */
  menu?: Record<string, string>
  /** numeric ranges: attribute -> { min, max } */
  numericRefinements?: Record<string, NumericRange>
  /** boolean facets: attribute -> on/off */
  toggles?: Record<string, boolean>
}

export type NumericRange = {
  min?: number
  max?: number
}

/**
 * The composed request sent to a SearchClient. Derived from UiState plus the set of
 * mounted widgets (which declare, via `facets`, the attributes they need counts for).
 */
export type SearchRequest = {
  query: string
  page: number
  hitsPerPage: number
  sortBy?: string
  facets: string[]
  refinements: Record<string, string[]>
  menu: Record<string, string>
  numericRefinements: Record<string, NumericRange>
  toggles: Record<string, boolean>
}

export type SearchHit = Record<string, unknown>

export type SearchResponse = {
  hits: SearchHit[]
  nbHits: number
  page: number
  nbPages: number
  hitsPerPage: number
  processingTimeMS: number
  /** attribute -> value -> count */
  facets?: Record<string, Record<string, number>>
  /** attribute -> numeric min/max across results */
  facetStats?: Record<string, { min: number; max: number }>
  /** attribute -> true when the returned facet values were capped (more distinct values exist) */
  facetTruncated?: Record<string, boolean>
}

export type FacetHit = {
  value: string
  highlighted?: string
  count: number
}

export type SearchForFacetValuesRequest = {
  attribute: string
  query: string
  maxFacetHits?: number
}

/**
 * Backend abstraction. The core knows nothing about Typesense; a host supplies an
 * implementation (see `adapters/typesense`).
 */
export type SearchClient = {
  search: (request: SearchRequest) => Promise<SearchResponse>
  /** Optional "search within a facet's values" channel, independent of the main results. */
  searchForFacetValues?: (request: SearchForFacetValuesRequest) => Promise<FacetHit[]>
  clearCache?: () => void
}

/**
 * The source of truth for UI state. The core owns no state of its own: it reads
 * `state` and commits via `write`. The default adapter is in-memory; a host can
 * supply one backed by URL query params (see the Nuxt adapter in RfcEditorSearch).
 */
export type StateAdapter = {
  state: Readonly<Ref<UiState>>
  write: (next: UiState) => void
  createURL?: (next: UiState) => string
}

export type SearchStatus = 'idle' | 'loading' | 'stalled' | 'error'

/**
 * A widget contributes to the composed request (typically by declaring which facet
 * attribute it needs counts for). Registered with the root on mount.
 */
export type Widget = {
  id: string
  getSearchParameters?: (request: SearchRequest, uiState: UiState) => SearchRequest
}

/** Provided by SearchRoot, injected by every widget via `useSearchContext`. */
export type SearchContext = {
  uiState: Readonly<Ref<UiState>>
  /** The configured baseline state. What ResetForm resets to and diffs against. */
  defaultUiState: UiState
  results: Readonly<ShallowRef<SearchResponse | null>>
  status: Readonly<Ref<SearchStatus>>
  error: Readonly<ShallowRef<unknown>>
  setUiState: (next: UiState | ((prev: UiState) => UiState)) => void
  registerWidget: (widget: Widget) => () => void
  searchForFacetValues: (request: SearchForFacetValuesRequest) => Promise<FacetHit[]>
  createURL: ((next: UiState) => string) | undefined
}

/** A record of class names for a widget's internal elements, keyed by element role. */
export type ClassNames = Record<string, string | string[] | undefined>
