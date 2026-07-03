import { afterEach, describe, expect, it, vi } from 'vitest'
import { createTypesenseSearchClient } from '../adapters/typesense'
import type { SearchRequest } from '../types'

const baseRequest = (over: Partial<SearchRequest> = {}): SearchRequest => ({
  query: 'http',
  page: 1,
  hitsPerPage: 10,
  facets: ['status.name'],
  refinements: { 'status.name': ['Proposed Standard'] },
  menu: {},
  numericRefinements: {},
  toggles: { contents: false },
  ...over
})

const okResponse = (body: unknown) => ({ ok: true, status: 200, statusText: 'OK', json: async () => body })

const multiSearchBody = {
  results: [
    {
      found: 2,
      hits: [{ document: { id: 'rfc1' } }],
      facet_counts: [{ field_name: 'status.name', counts: [{ value: 'Proposed Standard', count: 2 }] }],
      search_time_ms: 4
    }
  ]
}

afterEach(() => vi.unstubAllGlobals())

describe('typesense adapter', () => {
  it('builds the multi_search body and maps the response', async () => {
    const fetchMock = vi.fn(async (_url: string, _init: RequestInit) => okResponse(multiSearchBody))
    vi.stubGlobal('fetch', fetchMock)

    const client = createTypesenseSearchClient({
      host: 'example.test',
      apiKey: 'key',
      collection: 'docs',
      preset: (request) => (request.toggles.contents ? 'red-content' : 'red'),
      filterFor: () => ['type:=rfc']
    })

    const result = await client.search(baseRequest())

    expect(result.nbHits).toBe(2)
    expect(result.hits[0]).toEqual({ id: 'rfc1' })
    expect(result.facets?.['status.name']?.['Proposed Standard']).toBe(2)
    expect(result.page).toBe(1)
    expect(result.nbPages).toBe(1)

    const init = fetchMock.mock.calls[0]?.[1]
    const search = JSON.parse(String(init?.body)).searches[0]
    expect(search.collection).toBe('docs')
    expect(search.q).toBe('http')
    expect(search.preset).toBe('red')
    expect(search.page).toBe(2) // 0-based -> 1-based
    expect(search.per_page).toBe(10)
    expect(search.facet_by).toBe('status.name')
    expect(search.filter_by).toContain('type:=rfc')
    expect(search.filter_by).toContain('status.name:=[`Proposed Standard`]')
  })

  it('uses the content preset when the contents toggle is on and empty query becomes *', async () => {
    const fetchMock = vi.fn(async (_url: string, _init: RequestInit) => okResponse(multiSearchBody))
    vi.stubGlobal('fetch', fetchMock)

    const client = createTypesenseSearchClient({
      host: 'example.test',
      apiKey: 'key',
      collection: 'docs',
      preset: (request) => (request.toggles.contents ? 'red-content' : 'red')
    })

    await client.search(baseRequest({ query: '', toggles: { contents: true } }))

    const search = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)).searches[0]
    expect(search.preset).toBe('red-content')
    expect(search.q).toBe('*')
  })
})
