import { computed } from 'vue'
import { useSearchContext } from '../core/context'
import type { UiState } from '../types'
import { stableStringify } from '../utils/stableStringify'

export type UseResetFormOptions = {
  /** The state to reset to. Defaults to the SearchRoot's `defaultUiState`. */
  defaults?: UiState
}

/**
 * Resets the whole form to its configured defaults (query, refinements, sort, page,
 * toggles). Replaces InstantSearch's ClearRefinements, which only cleared facets.
 */
export function useResetForm(options: UseResetFormOptions = {}) {
  const context = useSearchContext()
  const defaults = options.defaults ?? context.defaultUiState

  const canReset = computed(() => stableStringify(prune(context.uiState.value)) !== stableStringify(prune(defaults)))

  const reset = () => {
    context.setUiState(() => ({ ...defaults }))
  }

  return { canReset, reset }
}

/** Drop empty/absent fields so equality ignores noise like `page: 0` vs missing. */
function prune(state: UiState): UiState {
  const result: UiState = {}
  if (state.query) result.query = state.query
  if (state.page) result.page = state.page
  if (state.hitsPerPage) result.hitsPerPage = state.hitsPerPage
  if (state.sortBy) result.sortBy = state.sortBy
  if (state.refinements && Object.keys(state.refinements).length) result.refinements = state.refinements
  if (state.menu && Object.keys(state.menu).length) result.menu = state.menu
  if (state.numericRefinements && Object.keys(state.numericRefinements).length) {
    result.numericRefinements = state.numericRefinements
  }
  if (state.toggles && Object.values(state.toggles).some(Boolean)) result.toggles = state.toggles
  return result
}
