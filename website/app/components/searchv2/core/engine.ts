import { computed, ref, shallowRef, watch } from 'vue'
import type {
  FacetHit,
  SearchClient,
  SearchContext,
  SearchForFacetValuesRequest,
  SearchRequest,
  SearchResponse,
  SearchStatus,
  StateAdapter,
  UiState,
  Widget
} from '../types'
import { stableStringify } from '../utils/stableStringify'

export type SearchEngineOptions = {
  searchClient: SearchClient
  adapter: StateAdapter
  defaultHitsPerPage?: number
  persistentFacets?: string[]
  stalledSearchDelayMs?: number
  /** The configured baseline state, exposed on the context for ResetForm. */
  defaultUiState?: UiState
}

export type SearchEngine = SearchContext & {
  start: () => void
  dispose: () => void
}

const DEFAULT_HITS_PER_PAGE = 10
const DEFAULT_STALLED_DELAY_MS = 200

/**
 * The generic search core. Owns no UI state of its own: state comes from the adapter.
 * Composes a request from the mounted widgets + adapter state, dispatches it (deduped,
 * coalesced, race-guarded), and exposes the response reactively.
 */
export function createSearchEngine(options: SearchEngineOptions): SearchEngine {
  const {
    searchClient,
    adapter,
    defaultHitsPerPage = DEFAULT_HITS_PER_PAGE,
    persistentFacets = [],
    stalledSearchDelayMs = DEFAULT_STALLED_DELAY_MS,
    defaultUiState = {}
  } = options

  const widgets = ref<Widget[]>([])
  const results = shallowRef<SearchResponse | null>(null)
  const status = ref<SearchStatus>('idle')
  const error = shallowRef<unknown>(null)

  const composedRequest = computed<SearchRequest>(() =>
    composeRequest(widgets.value, adapter.state.value, defaultHitsPerPage, persistentFacets)
  )
  const requestKey = computed(() => stableStringify(composedRequest.value))

  let started = false
  let scheduled = false
  let latestSeq = 0
  let lastDispatchedKey: string | null = null

  const scheduleSearch = () => {
    if (scheduled) return
    scheduled = true
    // Coalesce synchronous changes (widget registrations, multi-field writes) into one search.
    queueMicrotask(() => {
      scheduled = false
      if (started) void dispatch()
    })
  }

  const dispatch = async () => {
    const key = requestKey.value
    if (key === lastDispatchedKey) return
    lastDispatchedKey = key

    const request = composedRequest.value
    const seq = ++latestSeq
    status.value = 'loading'
    const stalledTimer = setTimeout(() => {
      if (seq === latestSeq) status.value = 'stalled'
    }, stalledSearchDelayMs)

    try {
      const response = await searchClient.search(request)
      if (seq !== latestSeq) return // a newer search superseded this one
      results.value = response
      error.value = null
      status.value = 'idle'
    } catch (caught) {
      if (seq !== latestSeq) return
      error.value = caught
      status.value = 'error'
    } finally {
      clearTimeout(stalledTimer)
    }
  }

  const stopWatch = watch(requestKey, () => scheduleSearch())

  const setUiState: SearchContext['setUiState'] = (next) => {
    const resolved = typeof next === 'function' ? next(adapter.state.value) : next
    adapter.write(resolved)
  }

  const registerWidget: SearchContext['registerWidget'] = (widget) => {
    widgets.value = [...widgets.value, widget]
    scheduleSearch()
    return () => {
      widgets.value = widgets.value.filter((candidate) => candidate !== widget)
      scheduleSearch()
    }
  }

  const searchForFacetValues = async (request: SearchForFacetValuesRequest): Promise<FacetHit[]> => {
    if (!searchClient.searchForFacetValues) return []
    return searchClient.searchForFacetValues(request)
  }

  return {
    uiState: adapter.state,
    defaultUiState,
    results,
    status,
    error,
    setUiState,
    registerWidget,
    searchForFacetValues,
    createURL: adapter.createURL,
    start: () => {
      started = true
      scheduleSearch()
    },
    dispose: () => {
      stopWatch()
    }
  }
}

function composeRequest(
  widgets: Widget[],
  uiState: UiState,
  defaultHitsPerPage: number,
  persistentFacets: string[]
): SearchRequest {
  const base: SearchRequest = {
    query: uiState.query ?? '',
    page: uiState.page ?? 0,
    hitsPerPage: uiState.hitsPerPage ?? defaultHitsPerPage,
    sortBy: uiState.sortBy,
    facets: [...persistentFacets],
    refinements: uiState.refinements ?? {},
    menu: uiState.menu ?? {},
    numericRefinements: uiState.numericRefinements ?? {},
    toggles: uiState.toggles ?? {}
  }
  const composed = widgets.reduce<SearchRequest>(
    (request, widget) => (widget.getSearchParameters ? widget.getSearchParameters(request, uiState) : request),
    base
  )
  // Sort so request identity is independent of widget registration order (stable dedup key).
  composed.facets = [...new Set(composed.facets)].sort()
  return composed
}
