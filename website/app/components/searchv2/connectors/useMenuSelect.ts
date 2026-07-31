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
  /**
   * A second facet whose values supply display labels for `attribute`'s values.
   *
   * Lets `attribute` be a stable identifier — a slug or acronym, which is what belongs in a URL
   * and in a filter — while the control still shows the human-readable name. Deriving labels
   * from the index this way means they can't drift from it, unlike a mapping hardcoded here.
   *
   * Values whose label can't be resolved fall back to showing the raw value.
   */
  labelAttribute?: string
  /**
   * Maps a `labelAttribute` value back to the `attribute` value it labels, eg
   * `(full) => full.split(' - ')[0]` to recover `art` from `art - Applications and Real-Time
   * Area`. Required for `labelAttribute` to have any effect.
   */
  labelKey?: (labelValue: string) => string
}

/** Single-select facet (replaces InstantSearch's MenuSelect). */
export function useMenuSelect(options: UseMenuSelectOptions) {
  const context = useSearchContext()
  const { attribute, limit = 20, labelAttribute, labelKey } = options

  onScopeDispose(
    context.registerWidget({
      id: `menu:${attribute}`,
      getSearchParameters: (request: SearchRequest) => {
        request.facets.push(attribute)
        // Requested for its values only; it's never filtered on.
        if (labelAttribute) request.facets.push(labelAttribute)
        return request
      }
    })
  )

  const selected = computed(() => context.uiState.value.menu?.[attribute] ?? '')
  const facetCounts = computed(() => context.results.value?.facets?.[attribute] ?? {})

  const labels = computed(() => {
    if (!labelAttribute || !labelKey) return undefined
    const labelCounts = context.results.value?.facets?.[labelAttribute]
    if (!labelCounts) return undefined
    return new Map(Object.keys(labelCounts).map((labelValue) => [labelKey(labelValue), labelValue]))
  })

  const items = computed<MenuItem[]>(() => {
    const list = Object.entries(facetCounts.value).map(([value, count]) => ({
      value,
      label: labels.value?.get(value) ?? value,
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
