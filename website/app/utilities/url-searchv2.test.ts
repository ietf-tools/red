// @vitest-environment nuxt
import { describe, test, expect } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { parseQuery, serializeQuery } from './searchv2-nuxt-adapter'
import { searchV2PathBuilder } from './url-searchv2'
import { searchV2PathBuilder as searchV2PathBuilderViaUrl } from './url'

/**
 * Pushes an href through the real parsing path the search page uses: vue-router decodes the
 * query string, then the adapter's `parseQuery` turns it into UiState. `searchV2PathBuilder`
 * and `parseQuery` are inverses, so exercising both is what proves a URL actually round-trips
 * rather than merely looking right.
 */
const roundTrip = (href: string) => {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/:rest(.*)', component: {} }] })
  return parseQuery(router.resolve(href).query, { toggles: { searchObsoleted: true, searchMetadataOnly: false } })
}

describe('searchV2PathBuilder — encoding', () => {
  test('round-trips a query with spaces and reserved characters', () => {
    expect(roundTrip(searchV2PathBuilder({ q: 'transport layer security' })).query).toBe('transport layer security')
    expect(roundTrip(searchV2PathBuilder({ q: 'a&b#c=d' })).query).toBe('a&b#c=d')
    expect(roundTrip(searchV2PathBuilder({ q: 'C++ parser' })).query).toBe('C++ parser')
  })

  test('round-trips multi-select facets, including values containing commas', () => {
    const href = searchV2PathBuilder({
      status: ['Internet Standard', 'Best Current Practice'],
      authors: ['Smith, Jr.', 'Bo']
    })
    // Repeated params, so the comma stays part of the value instead of splitting it.
    expect(href).toContain('authors=Smith%2C+Jr.&authors=Bo')
    expect(roundTrip(href).refinements).toEqual({
      'status.name': ['Internet Standard', 'Best Current Practice'],
      'authors.name': ['Smith, Jr.', 'Bo']
    })
  })

  test('round-trips single-select menus, sort, paging and toggles', () => {
    const state = roundTrip(
      searchV2PathBuilder({
        stream: 'ietf',
        area: 'sec',
        sort: 'publicationDate:desc',
        page: 3,
        perPage: 25,
        searchObsoleted: false,
        searchMetadataOnly: true
      })
    )
    // Keyed on the index's stable identifiers, not its display names.
    expect(state.menu).toEqual({ 'stream.slug': 'ietf', 'area.acronym': 'sec' })
    expect(state.sortBy).toBe('publicationDate:desc')
    expect(state.page).toBe(2) // 1-based in the URL, 0-based in UiState
    expect(state.hitsPerPage).toBe(25)
    expect(state.toggles).toEqual({ searchObsoleted: false, searchMetadataOnly: true })
  })

  test('returns a bare search path when given no params', () => {
    expect(searchV2PathBuilder({})).toBe('/search/')
    expect(roundTrip('/search/').refinements).toBeUndefined()
  })
})

describe('searchV2PathBuilder — publication date', () => {
  test('writes a range as readable yyyy-M', () => {
    const href = searchV2PathBuilder({ published: { from: { year: 1990, month: 1 }, to: { year: 1991, month: 5 } } })
    expect(href).toBe('/search/?from=1990-1&to=1991-5')

    // `from` covers the month from its first second, `to` through its last.
    expect(roundTrip(href).numericRefinements?.publicationDate).toEqual({
      min: Math.floor(Date.UTC(1990, 0, 1, 0, 0, 0) / 1000),
      max: Math.floor(Date.UTC(1991, 5, 0, 23, 59, 59) / 1000)
    })
  })

  test('writes a monthless bound as a bare year covering the whole year', () => {
    const href = searchV2PathBuilder({ published: { from: { year: 1990 }, to: { year: 1991 } } })
    expect(href).toBe('/search/?from=1990&to=1991')
    expect(roundTrip(href).numericRefinements?.publicationDate).toEqual({
      min: Math.floor(Date.UTC(1990, 0, 1, 0, 0, 0) / 1000),
      max: Math.floor(Date.UTC(1991, 12, 0, 23, 59, 59) / 1000)
    })
  })

  test('round-trips an open-ended range', () => {
    const href = searchV2PathBuilder({ published: { from: { year: 1990, month: 3 } } })
    expect(href).toBe('/search/?from=1990-3')
    expect(roundTrip(href).numericRefinements?.publicationDate).toEqual({
      min: Math.floor(Date.UTC(1990, 2, 1, 0, 0, 0) / 1000),
      max: undefined
    })
  })
})

describe('searchV2PathBuilder — status vocabulary', () => {
  test('accepts every status the response schema declares', () => {
    // 'Not Issued' is declared by `typesense-status.ts` and omitted by the legacy
    // searchPathBuilder's union, so it exercises the derivation. Note it isn't currently present
    // in the index — never-issued RFCs live at /never-issued/ — so filtering on it finds nothing.
    expect(searchV2PathBuilder({ status: ['Not Issued'] })).toBe('/search/?status=Not+Issued')
    expect(roundTrip('/search/?status=Not+Issued').refinements?.['status.name']).toEqual(['Not Issued'])
  })

  test('rejects a status the index cannot return', () => {
    // Guards the derivation from the index schema: if the union ever widened to `string` this
    // directive would itself become an error, so the test fails either way.
    // @ts-expect-error 'Nonexistent Status' is not a value the index can return
    searchV2PathBuilder({ status: ['Nonexistent Status'] })
  })
})

/**
 * The worker's legacy `/search/rfc_search.php` redirects target this page, and rewriting the
 * worker isn't on the table, so the URLs it emits have to parse correctly here. These hrefs are
 * copied from `worker/src/legacy-search-redirect.test.ts`, which asserts that exact output.
 */
describe('worker legacy search redirect compatibility', () => {
  test('reads the yyyy-M date bounds it emits', () => {
    const state = roundTrip('/search/?area=art&from=1970-1&q=900+q&status=Best+Current+Practice&stream=ietf&to=1971-5')
    expect(state.numericRefinements?.publicationDate).toEqual({
      min: Math.floor(Date.UTC(1970, 0, 1, 0, 0, 0) / 1000),
      max: Math.floor(Date.UTC(1971, 5, 0, 23, 59, 59) / 1000)
    })
  })

  test('splits the comma-separated status it emits', () => {
    const state = roundTrip('/search/?status=Best+Current+Practice%2CExperimental%2CProposed+Standard')
    expect(state.refinements?.['status.name']).toEqual(['Best Current Practice', 'Experimental', 'Proposed Standard'])
  })

  test('resolves the lowercase stream slug and bare area acronym it emits', () => {
    // Verified against the staging index: `stream.slug` is ietf|legacy|ise|iab|irtf|editorial and
    // `area.acronym` includes art, which is exactly what the redirect produces.
    expect(roundTrip('/search/?stream=ietf').menu).toEqual({ 'stream.slug': 'ietf' })
    expect(roundTrip('/search/?area=art').menu).toEqual({ 'area.acronym': 'art' })

    // `stream_name=Independent` maps to the `ise` slug, which the index does use.
    expect(roundTrip('/search/?stream=ise').menu).toEqual({ 'stream.slug': 'ise' })
  })

  test('round-trips an area the old worker acronym list omitted', () => {
    // `iesg` was one of eight acronyms absent from the removed hardcoded map.
    const state = roundTrip('/search/?area=iesg')
    expect(state.menu).toEqual({ 'area.acronym': 'iesg' })
    expect(serializeQuery(state).area).toBe('iesg')
  })
})

/**
 * `url.ts` re-exports this builder, and the two modules import each other. The cycle is only
 * safe because neither side dereferences the other at module-evaluation time, so this asserts
 * the re-exported binding actually resolves at runtime rather than just typechecking.
 */
test('url.ts re-exports the same builder', () => {
  expect(searchV2PathBuilderViaUrl).toBe(searchV2PathBuilder)
  expect(searchV2PathBuilderViaUrl({ q: 'quic' })).toBe('/search/?q=quic')
})
