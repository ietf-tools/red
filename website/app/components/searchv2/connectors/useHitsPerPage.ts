import { computed } from 'vue'
import { useSearchContext } from '../core/context'

export type HitsPerPageItem = {
  label: string
  value: number
  default?: boolean
}

export function useHitsPerPage(items: HitsPerPageItem[]) {
  const context = useSearchContext()

  const defaultValue = computed(() => items.find((item) => item.default)?.value ?? items[0]?.value ?? 10)
  const current = computed(() => context.uiState.value.hitsPerPage ?? defaultValue.value)

  const refine = (value: number) => {
    context.setUiState((previous) => ({ ...previous, hitsPerPage: value, page: 0 }))
  }

  return { items, current, refine }
}
