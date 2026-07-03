import { ref } from 'vue'
import type { StateAdapter, UiState } from '../types'

/** Default state adapter. Holds UiState in a reactive ref. Used standalone and in tests. */
export function createInMemoryAdapter(initial: UiState = {}): StateAdapter {
  const state = ref<UiState>(initial)
  return {
    state,
    write: (next) => {
      state.value = next
    }
  }
}
