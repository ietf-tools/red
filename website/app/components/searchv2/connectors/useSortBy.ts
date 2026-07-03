import { computed } from 'vue'
import { useSearchContext } from '../core/context'

export type SortByItem = {
  label: string
  value: string
}

export function useSortBy(items: SortByItem[]) {
  const context = useSearchContext()

  const current = computed(() => context.uiState.value.sortBy ?? items[0]?.value ?? '')

  const refine = (value: string) => {
    context.setUiState((previous) => ({ ...previous, sortBy: value, page: 0 }))
  }

  return { items, current, refine }
}
