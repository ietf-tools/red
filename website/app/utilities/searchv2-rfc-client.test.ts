// @vitest-environment nuxt
import { afterEach, describe, expect, test, vi } from 'vitest'
import { createRfcSearchClient } from './searchv2-rfc-client'
import type { SearchRequest } from '~/components/searchv2'

const okResponse = (body: unknown) => ({ ok: true, status: 200, statusText: 'OK', json: async () => body })

const facetBody = {
  results: [
    {
      found: 1,
      hits: [],
      facet_counts: [{ field_name: 'authors.name', counts: [{ value: 'S. Bradner', count: 1 }] }]
    }
  ]
}

const request = (over: Partial<SearchRequest> = {}): SearchRequest => ({
  query: '',
  page: 0,
  hitsPerPage: 20,
  facets: ['authors.name'],
  refinements: {},
  menu: {},
  numericRefinements: {},
  toggles: { searchObsoleted: true },
  ...over
})

const client = () => createRfcSearchClient({ host: 'example.test', apiKey: 'key', onSubseries: () => undefined })

afterEach(() => vi.unstubAllGlobals())

describe('createRfcSearchClient', () => {
  test('facet values are scoped to the rewritten query, not the literal text', async () => {
    const fetchMock = vi.fn(async (_url: string, _init: RequestInit) => okResponse(facetBody))
    vi.stubGlobal('fetch', fetchMock)

    await client().searchForFacetValues?.({
      attribute: 'authors.name',
      query: 'brad',
      search: request({ query: 'rfc 2119' })
    })

    const search = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)).searches[0]
    expect(search.q).toBe('*')
    expect(search.filter_by).toContain('rfc:=[`2119`]')
    expect(search.facet_query).toBe('authors.name:brad')
  })

  test('facet values carry the current refinements and filters', async () => {
    const fetchMock = vi.fn(async (_url: string, _init: RequestInit) => okResponse(facetBody))
    vi.stubGlobal('fetch', fetchMock)

    await client().searchForFacetValues?.({
      attribute: 'authors.name',
      query: 'brad',
      search: request({ query: 'email', refinements: { 'status.name': ['Historic'] }, toggles: {} })
    })

    const search = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)).searches[0]
    expect(search.q).toBe('email')
    expect(search.preset).toBe('red-content')
    expect(search.filter_by).toContain('type:=rfc')
    expect(search.filter_by).toContain('status.name:=[`Historic`]')
    // `searchObsoleted` off means obsoleted/historic RFCs are excluded from the results, so
    // they must not contribute authors to the offered values either.
    expect(search.filter_by).toContain('flags.hiddenDefault:=false')
  })
})
