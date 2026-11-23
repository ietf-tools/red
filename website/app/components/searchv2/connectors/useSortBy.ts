import { computed, watch } from 'vue'
import { useSearchContext } from '../core/context'

export type SortByItem = {
  label: string
  value: string
}

/**
 * `getItems` is a getter because what is offered can change while the control is mounted. A sort the
 * control no longer offers is cleared, so that results are never ordered by something it cannot show.
 */
export function useSortBy(getItems: () => SortByItem[]) {
  const context = useSearchContext()

  const items = computed(getItems)
  const current = computed(() => context.uiState.value.sortBy ?? items.value[0]?.value ?? '')

  const refine = (value: string) => {
    context.setUiState((previous) => ({ ...previous, sortBy: value, page: 0 }))
  }

  watch(
    items,
    (offered) => {
      const { sortBy } = context.uiState.value
      if (sortBy && !offered.some(({ value }) => value === sortBy)) {
        context.setUiState((previous) => ({ ...previous, sortBy: undefined, page: 0 }))
      }
    },
    { immediate: true }
  )

  return { items, current, refine }
}
