<template>
  <slot />
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import type { SearchClient, StateAdapter, UiState } from '../types'
import { createSearchEngine } from './engine'
import { createInMemoryAdapter } from './inMemoryAdapter'
import { provideSearchContext } from './context'

type Props = {
  searchClient: SearchClient
  /** Source of truth for UI state. Defaults to an in-memory adapter. */
  stateAdapter?: StateAdapter
  /** Seed for the in-memory adapter (ignored when `stateAdapter` is supplied). */
  initialUiState?: UiState
  /** Facet attributes always requested, even when their widget is unmounted. */
  persistentFacets?: string[]
  defaultHitsPerPage?: number
  stalledSearchDelayMs?: number
  /** Baseline state that ResetForm resets to. Also seeds the in-memory adapter. */
  defaultUiState?: UiState
}

const props = defineProps<Props>()

const adapter = props.stateAdapter ?? createInMemoryAdapter(props.initialUiState ?? props.defaultUiState ?? {})

const engine = createSearchEngine({
  searchClient: props.searchClient,
  adapter,
  persistentFacets: props.persistentFacets,
  defaultHitsPerPage: props.defaultHitsPerPage,
  stalledSearchDelayMs: props.stalledSearchDelayMs,
  defaultUiState: props.defaultUiState
})

const { start, dispose, ...context } = engine
provideSearchContext(context)
defineExpose(context)

onMounted(start)
onBeforeUnmount(dispose)
</script>
