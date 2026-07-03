import { computed } from 'vue'
import { useSearchContext } from '../core/context'

export type UseToggleRefinementOptions = {
  attribute: string
}

/**
 * Boolean facet. The toggle value flows through UiState.toggles; how it maps to a
 * filter (or, for RFC, a preset swap) is the SearchClient's concern, not the library's.
 */
export function useToggleRefinement(options: UseToggleRefinementOptions) {
  const context = useSearchContext()
  const { attribute } = options

  const value = computed(() => context.uiState.value.toggles?.[attribute] ?? false)

  const refine = (next?: boolean) => {
    context.setUiState((previous) => {
      const toggles = { ...previous.toggles }
      toggles[attribute] = next ?? !value.value
      return { ...previous, toggles, page: 0 }
    })
  }

  return { value, refine }
}
