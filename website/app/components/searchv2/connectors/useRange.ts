import { computed, onScopeDispose } from 'vue'
import { useSearchContext } from '../core/context'
import type { NumericRange, SearchRequest } from '../types'

export type UseRangeOptions = {
  attribute: string
}

/** Numeric range facet (replaces InstantSearch's RangeInput). */
export function useRange(options: UseRangeOptions) {
  const context = useSearchContext()
  const { attribute } = options

  onScopeDispose(
    context.registerWidget({
      id: `range:${attribute}`,
      getSearchParameters: (request: SearchRequest) => {
        request.facets.push(attribute)
        return request
      }
    })
  )

  const bounds = computed(() => context.results.value?.facetStats?.[attribute])
  const current = computed<NumericRange>(() => context.uiState.value.numericRefinements?.[attribute] ?? {})

  const refine = (next: NumericRange) => {
    context.setUiState((previous) => {
      const numericRefinements = { ...previous.numericRefinements }
      if (next.min === undefined && next.max === undefined) delete numericRefinements[attribute]
      else numericRefinements[attribute] = next
      return { ...previous, numericRefinements, page: 0 }
    })
  }

  return { bounds, current, refine }
}
