import { computed } from 'vue'
import { useSearchContext } from '../core/context'
import type { SearchHit } from '../types'

export function useHits<T = SearchHit>() {
  const context = useSearchContext()

  const items = computed(() => (context.results.value?.hits ?? []) as T[])
  const nbHits = computed(() => context.results.value?.nbHits ?? 0)
  const isEmpty = computed(() => context.results.value !== null && items.value.length === 0)

  return { items, nbHits, isEmpty, status: context.status }
}
