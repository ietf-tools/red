import { computed } from 'vue'
import { useSearchContext } from '../core/context'

export function useStats() {
  const context = useSearchContext()

  const nbHits = computed(() => context.results.value?.nbHits ?? 0)
  const processingTimeMS = computed(() => context.results.value?.processingTimeMS ?? 0)
  const query = computed(() => context.uiState.value.query ?? '')
  const hasResults = computed(() => context.results.value !== null)

  return { nbHits, processingTimeMS, query, hasResults, status: context.status }
}
