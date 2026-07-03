import { computed, onScopeDispose, ref, watch } from 'vue'
import { useSearchContext } from '../core/context'
import { debounce } from '../utils/debounce'

export type UseSearchBoxOptions = {
  /** Debounce before the typed query is committed to state (the URL). */
  debounceMs?: number
}

/**
 * Query connector. Keeps a local display value so the debounced state write never
 * causes cursor jitter; reconciles with external state when the input is not focused.
 */
export function useSearchBox(options: UseSearchBoxOptions = {}) {
  const context = useSearchContext()
  const { debounceMs = 300 } = options

  onScopeDispose(context.registerWidget({ id: 'searchBox' }))

  const query = ref(context.uiState.value.query ?? '')
  let focused = false

  watch(
    () => context.uiState.value.query ?? '',
    (next) => {
      if (!focused) query.value = next
    }
  )

  const commit = (value: string) => {
    context.setUiState((previous) => ({ ...previous, query: value, page: 0 }))
  }
  const debouncedCommit = debounce(commit, debounceMs)

  const setQuery = (value: string) => {
    query.value = value
    debouncedCommit(value)
  }

  const submit = () => {
    debouncedCommit.cancel()
    commit(query.value)
  }

  const clear = () => {
    query.value = ''
    debouncedCommit.cancel()
    commit('')
  }

  const onFocus = () => {
    focused = true
  }
  const onBlur = () => {
    focused = false
    query.value = context.uiState.value.query ?? ''
  }

  const isSearchStalled = computed(() => context.status.value === 'stalled')

  return { query, setQuery, submit, clear, onFocus, onBlur, isSearchStalled }
}
