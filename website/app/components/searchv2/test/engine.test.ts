import { describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { createSearchEngine } from '../core/engine'
import { createInMemoryAdapter } from '../core/inMemoryAdapter'
import type { SearchResponse } from '../types'

const response = (nbHits: number): SearchResponse => ({
  hits: [],
  nbHits,
  page: 0,
  nbPages: 1,
  hitsPerPage: 10,
  processingTimeMS: 1
})

describe('search engine', () => {
  it('runs exactly one search on start with mounted widgets', async () => {
    const search = vi.fn(async () => response(3))
    const engine = createSearchEngine({ searchClient: { search }, adapter: createInMemoryAdapter({ query: 'x' }) })
    engine.registerWidget({ id: 'a' })
    engine.registerWidget({ id: 'b' })
    engine.start()
    await flushPromises()
    expect(search).toHaveBeenCalledTimes(1)
    expect(engine.results.value?.nbHits).toBe(3)
  })

  it('dedupes identical requests and searches again on change', async () => {
    const search = vi.fn(async () => response(1))
    const engine = createSearchEngine({ searchClient: { search }, adapter: createInMemoryAdapter({ query: 'x' }) })
    engine.start()
    await flushPromises()
    engine.setUiState({ query: 'x' })
    await flushPromises()
    expect(search).toHaveBeenCalledTimes(1)
    engine.setUiState({ query: 'y' })
    await flushPromises()
    expect(search).toHaveBeenCalledTimes(2)
  })

  it('discards stale out-of-order responses', async () => {
    const resolvers: Array<(value: SearchResponse) => void> = []
    const search = vi.fn(() => new Promise<SearchResponse>((resolve) => resolvers.push(resolve)))
    const engine = createSearchEngine({ searchClient: { search }, adapter: createInMemoryAdapter({ query: 'a' }) })
    engine.start()
    await flushPromises()
    engine.setUiState({ query: 'b' })
    await flushPromises()
    expect(search).toHaveBeenCalledTimes(2)

    // newest search resolves first, the stale one second
    resolvers[1]?.(response(20))
    await flushPromises()
    resolvers[0]?.(response(10))
    await flushPromises()

    expect(engine.results.value?.nbHits).toBe(20)
  })

  it('hands the current composed search to searchForFacetValues', async () => {
    const search = vi.fn(async () => response(1))
    const searchForFacetValues = vi.fn(async () => [])
    const engine = createSearchEngine({
      searchClient: { search, searchForFacetValues },
      adapter: createInMemoryAdapter({ query: 'email', refinements: { 'status.name': ['Historic'] } })
    })
    engine.registerWidget({
      id: 'refinementList:authors.name',
      getSearchParameters: (request) => {
        request.facets.push('authors.name')
        return request
      }
    })
    engine.start()
    await flushPromises()

    await engine.searchForFacetValues({ attribute: 'authors.name', query: 'kle' })

    expect(searchForFacetValues).toHaveBeenCalledWith(
      expect.objectContaining({
        attribute: 'authors.name',
        query: 'kle',
        search: expect.objectContaining({
          query: 'email',
          refinements: { 'status.name': ['Historic'] }
        })
      })
    )
  })
})
