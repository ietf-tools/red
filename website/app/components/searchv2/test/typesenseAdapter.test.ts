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

  it('flags facetTruncated when total_values exceeds the returned counts', async () => {
    const body = {
      results: [
        {
          found: 50,
          hits: [{ document: { id: 'rfc1' } }],
          facet_counts: [
            {
              field_name: 'authors',
              counts: [
                { value: 'Alice', count: 3 },
                { value: 'Bob', count: 2 }
              ],
              stats: { total_values: 42 }
            }
          ]
        }
      ]
    }
    const fetchMock = vi.fn(async (_url: string, _init: RequestInit) => okResponse(body))
    vi.stubGlobal('fetch', fetchMock)

    const client = createTypesenseSearchClient({
      host: 'example.test',
      apiKey: 'key',
      collection: 'docs',
      maxFacetValues: 2
    })

    const result = await client.search(baseRequest({ facets: ['authors'], refinements: {} }))

    expect(result.facetTruncated?.authors).toBe(true)

    const search = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)).searches[0]
    expect(search.max_facet_values).toBe(2)
  })

  describe('searchForFacetValues', () => {
    const facetBody = {
      results: [
        {
          found: 273,
          hits: [],
          facet_counts: [
            {
              field_name: 'authors.name',
              counts: [{ value: 'J. Klensin', count: 5, highlighted: 'J. <mark>Kle</mark>nsin' }]
            }
          ]
        }
      ]
    }

    const facetClient = () =>
      createTypesenseSearchClient({
        host: 'example.test',
        apiKey: 'key',
        collection: 'docs',
        preset: (request) => (request.toggles.contents ? 'red-content' : 'red'),
        filterFor: () => ['type:=rfc']
      })

    it('scopes facet values to the current search rather than the whole collection', async () => {
      const fetchMock = vi.fn(async (_url: string, _init: RequestInit) => okResponse(facetBody))
      vi.stubGlobal('fetch', fetchMock)

      const hits = await facetClient().searchForFacetValues?.({
        attribute: 'authors.name',
        query: 'kle',
        maxFacetHits: 50,
        search: baseRequest({ query: 'email', toggles: { contents: true } })
      })

      expect(hits).toEqual([{ value: 'J. Klensin', count: 5, highlighted: 'J. <mark>Kle</mark>nsin' }])

      const search = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)).searches[0]
      expect(search.q).toBe('email')
      // Without the preset Typesense rejects a non-wildcard query: "No search fields specified".
      expect(search.preset).toBe('red-content')
      expect(search.filter_by).toContain('type:=rfc')
      expect(search.filter_by).toContain('status.name:=[`Proposed Standard`]')
      expect(search.facet_by).toBe('authors.name')
      expect(search.facet_query).toBe('authors.name:kle')
      expect(search.facet_query_num_typos).toBe(0)
      expect(search.max_facet_values).toBe(50)
      expect(search.per_page).toBe(0)
    })

    it('falls back to the whole collection when no current search is supplied', async () => {
      const fetchMock = vi.fn(async (_url: string, _init: RequestInit) => okResponse(facetBody))
      vi.stubGlobal('fetch', fetchMock)

      await facetClient().searchForFacetValues?.({ attribute: 'authors.name', query: 'kle' })

      const search = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)).searches[0]
      expect(search.q).toBe('*')
      expect(search.filter_by).toBeUndefined()
    })

    it('caches identical facet searches and clears with clearCache', async () => {
      const fetchMock = vi.fn(async (_url: string, _init: RequestInit) => okResponse(facetBody))
      vi.stubGlobal('fetch', fetchMock)

      const client = facetClient()
      const request = { attribute: 'authors.name', query: 'kle', search: baseRequest() }
      await client.searchForFacetValues?.(request)
      await client.searchForFacetValues?.(request)
      expect(fetchMock).toHaveBeenCalledTimes(1)

      client.clearCache?.()
      await client.searchForFacetValues?.(request)
      expect(fetchMock).toHaveBeenCalledTimes(2)
    })
  })

  it('does not flag facetTruncated when all values are returned', async () => {
    const body = {
      results: [
        {
          found: 5,
          hits: [],
          facet_counts: [{ field_name: 'authors', counts: [{ value: 'Alice', count: 3 }], stats: { total_values: 1 } }]
        }
      ]
    }
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, _init: RequestInit) => okResponse(body))
    )

    const client = createTypesenseSearchClient({ host: 'example.test', apiKey: 'key', collection: 'docs' })
    const result = await client.search(baseRequest({ facets: ['authors'], refinements: {} }))

    expect(result.facetTruncated).toBeUndefined()
  })
})
