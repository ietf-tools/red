import { computed, onScopeDispose } from 'vue'
import { useSearchContext } from '../core/context'
import type { SearchRequest } from '../types'

export type MenuItem = {
  value: string
  label: string
  count: number
  isRefined: boolean
}

export type UseMenuSelectOptions = {
  attribute: string
  limit?: number
}

/** Single-select facet (replaces InstantSearch's MenuSelect). */
export function useMenuSelect(options: UseMenuSelectOptions) {
  const context = useSearchContext()
  const { attribute, limit = 20 } = options

  onScopeDispose(
    context.registerWidget({
      id: `menu:${attribute}`,
      getSearchParameters: (request: SearchRequest) => {
        request.facets.push(attribute)
        return request
      }
    })
  )

  const selected = computed(() => context.uiState.value.menu?.[attribute] ?? '')
  const facetCounts = computed(() => context.results.value?.facets?.[attribute] ?? {})

  const items = computed<MenuItem[]>(() => {
    const list = Object.entries(facetCounts.value).map(([value, count]) => ({
      value,
      label: value,
      count,
      isRefined: value === selected.value
    }))
    list.sort((a, b) => b.count - a.count || a.value.localeCompare(b.value))
    if (selected.value && !list.some((item) => item.value === selected.value)) {
      list.unshift({ value: selected.value, label: selected.value, count: 0, isRefined: true })
    }
    return list.slice(0, limit)
  })

  const refine = (value: string) => {
    context.setUiState((previous) => {
      const menu = { ...previous.menu }
      if (value) menu[attribute] = value
      else delete menu[attribute]
      return { ...previous, menu, page: 0 }
    })
  }

  return { selected, items, refine }
}
