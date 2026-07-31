// @vitest-environment nuxt
import { test, expect } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { parseQuery } from './searchv2-nuxt-adapter'
import {
  searchV2PathBuilder,
  IETF_PRIVACY_STATEMENT_URL,
  rfcCitePathBuilder,
  rfcFormatPathBuilder,
  textToAnchorId,
  isExternalLink,
  isInternalLink,
  isMailToLink,
  isTelLink,
  isOutsideNuxtLink,
  parseMaybeRfcLink,
  isHashLink
} from './url'
import type { ValidHrefs } from './url'

/**
 * Should error if ValidHrefs type becomes overly broad (ie `string` or
 * `any`) so it matches a non-existant href, hence the variable name.
 * To fix this bug look at ValidHrefs itself, find the new type that is
 * overly broad and fix it. If you made a pathBuilder function ensure
 * the return value(s) have `as const` like the other path builder functions.
 */
// @ts-expect-error See preceding comment
const _HrefThatShouldFail: ValidHrefs = '/href-that-should-fail/'

/**
 * Should catch if ValidHrefs fails to match a markdown path.
 *
 * (Although this succeeds with current markdown files it's possible that future
 * markdown changes to break this, and if so just choose another working href
 * from ValidHrefs)
 */
const _HrefThatShouldSucceed: ValidHrefs = '/series/rfc/#what-is-an-rfc'

test('rfcCitePathBuilder: txt', () => {
  expect(rfcCitePathBuilder('rfc9000', 'txt')).toEqual('/refs/ref9000.txt')
  expect(rfcCitePathBuilder('RFC9000', 'txt')).toEqual('/refs/ref9000.txt')
})

test('rfcCitePathBuilder: xml', () => {
  expect(rfcCitePathBuilder('rfc9000', 'xml')).toEqual('https://bib.ietf.org/public/rfc/bibxml/reference.RFC.9000.xml')
  expect(rfcCitePathBuilder('RFC9000', 'xml')).toEqual('https://bib.ietf.org/public/rfc/bibxml/reference.RFC.9000.xml')
})

test('rfcCitePathBuilder: bibTeX', () => {
  expect(rfcCitePathBuilder('rfc9000', 'bibTeX')).toEqual('https://datatracker.ietf.org/doc/rfc9000/bibtex/')
  expect(rfcCitePathBuilder('RFC9000', 'bibTeX')).toEqual('https://datatracker.ietf.org/doc/rfc9000/bibtex/')
})

test('rfcFormatPathBuilder: html', () => {
  expect(rfcFormatPathBuilder('rfc9000', 'html')).toEqual('/rfc/rfc9000.html')
  expect(rfcFormatPathBuilder('RFC9000', 'html')).toEqual('/rfc/rfc9000.html')
})

test('textToAnchorId', () => {
  expect(textToAnchorId('What Sort Of Documents Are Independent Submissions?')).toEqual(
    'what-sort-of-documents-are-independent-submissions'
  )

  expect(
    textToAnchorId('Some RFCs') // testing to ensure it doesn't turn 'RFCs' into 'rf-cs' which can happen with incorrect usage of kebabCase
  ).toEqual('some-rfcs')

  expect(
    textToAnchorId('Section 2.2') // testing to ensure it doesn't turn "2.2" into "22" which wouldn't be easy to read as an anchor id.
  ).toEqual('section-2-2')
})

test('isExternalLink', () => {
  expect(isExternalLink(undefined)).toEqual(true)
  expect(isExternalLink('/something')).toEqual(false)
  expect(isExternalLink('#something')).toEqual(false)
  expect(isExternalLink('http://')).toEqual(true)
  expect(isExternalLink('https://')).toEqual(true)
  expect(isExternalLink(IETF_PRIVACY_STATEMENT_URL)).toEqual(true)
})

test('isInternalLink', () => {
  expect(isInternalLink(undefined)).toEqual(false)
  expect(isInternalLink('/something')).toEqual(true)
  expect(isInternalLink('#something')).toEqual(true)
  expect(isInternalLink('http://')).toEqual(false)
  expect(isInternalLink('https://')).toEqual(false)
  expect(isInternalLink(IETF_PRIVACY_STATEMENT_URL)).toEqual(false)
})

test('isMailToLink', () => {
  expect(isMailToLink(undefined)).toEqual(false)
  expect(isMailToLink('/something')).toEqual(false)
  expect(isMailToLink('#something')).toEqual(false)
  expect(isMailToLink('http://')).toEqual(false)
  expect(isMailToLink('https://')).toEqual(false)
  expect(isMailToLink(IETF_PRIVACY_STATEMENT_URL)).toEqual(false)
  expect(
    isMailToLink(
      // with a leading space, should not match
      ' mailto:user@example.com'
    )
  ).toEqual(false)

  expect(isMailToLink('mailto:user@example.com')).toEqual(true)
  expect(isMailToLink('tel:+17036253917')).toEqual(false)
})

test('isTelLink', () => {
  expect(isTelLink(undefined)).toEqual(false)
  expect(isTelLink('/something')).toEqual(false)
  expect(isTelLink('#something')).toEqual(false)
  expect(isTelLink('http://')).toEqual(false)
  expect(isTelLink('https://')).toEqual(false)
  expect(isTelLink(IETF_PRIVACY_STATEMENT_URL)).toEqual(false)
  expect(isTelLink('mailto:user@example.com')).toEqual(false)
  expect(
    isTelLink(
      // with a leading space, should not match
      ' tel:+17036253917'
    )
  ).toEqual(false)

  expect(isTelLink('tel:+17036253917')).toEqual(true)
})

test('isOutsideNuxtLink', () => {
  // Phone and email links must not become NuxtLinks, otherwise Vue Router treats them as routes
  // and the browser never gets the chance to hand them to the dialler or mail client.
  expect(isOutsideNuxtLink('tel:+17036253917')).toEqual(true)
  expect(isOutsideNuxtLink('mailto:user@example.com')).toEqual(true)

  expect(isOutsideNuxtLink('/about/contact/')).toEqual(false)
})

test('isHashLink', () => {
  expect(isHashLink('#something')).toEqual(true)

  expect(
    isHashLink(
      // leading space, should not match
      ' #something'
    )
  ).toEqual(false)

  expect(isHashLink(undefined)).toEqual(false)
  expect(isHashLink('/something')).toEqual(false)
  expect(isHashLink('http://')).toEqual(false)
  expect(isHashLink('https://')).toEqual(false)
  expect(isHashLink(IETF_PRIVACY_STATEMENT_URL)).toEqual(false)
  expect(isHashLink('mailto:user@example.com')).toEqual(false)
})

test('parseMaybeRfcLink', () => {
  expect(parseMaybeRfcLink('/something/rfc1/something-else')).toEqual({
    type: 'rfc',
    number: 1
  })

  expect(parseMaybeRfcLink('/rfc/rfc10101')).toEqual({
    type: 'rfc',
    number: 10101
  })

  expect(parseMaybeRfcLink('#rfc10101')).toEqual({
    type: 'rfc',
    number: 10101
  })

  expect(parseMaybeRfcLink('/')).toEqual(undefined)
  expect(parseMaybeRfcLink('#section-2.1')).toEqual(undefined)
  expect(parseMaybeRfcLink('https://example.com/')).toEqual(undefined)
  expect(
    // not a known domain, so don't make a preview link of content we
    // might be wrong about, even though it's got RFC stuff in the `href`
    parseMaybeRfcLink('https://example.com/rfc/rfc10101#section-2.1')
  ).toEqual(undefined)
})

/**
 * End-to-end check that `searchV2PathBuilder` output survives the real parsing path the
 * search page uses: vue-router decodes the query string, then the adapter's `parseQuery`
 * turns it into UiState.
 */
const roundTrip = (href: string) => {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/:rest(.*)', component: {} }] })
  return parseQuery(router.resolve(href).query, { toggles: { searchObsoleted: true, searchMetadataOnly: false } })
}

test('searchV2PathBuilder round-trips a query with spaces and reserved characters', () => {
  expect(roundTrip(searchV2PathBuilder({ q: 'transport layer security' })).query).toBe('transport layer security')
  expect(roundTrip(searchV2PathBuilder({ q: 'a&b#c=d' })).query).toBe('a&b#c=d')
  expect(roundTrip(searchV2PathBuilder({ q: 'C++ parser' })).query).toBe('C++ parser')
})

test('searchV2PathBuilder round-trips multi-select facets, including values with commas', () => {
  const href = searchV2PathBuilder({
    status: ['Internet Standard', 'Best Current Practice'],
    authors: ['Smith, Jr.', 'Bo']
  })
  expect(href).toContain('authors=Smith%2C+Jr.&authors=Bo')
  expect(roundTrip(href).refinements).toEqual({
    'status.name': ['Internet Standard', 'Best Current Practice'],
    'authors.name': ['Smith, Jr.', 'Bo']
  })
})

test('searchV2PathBuilder round-trips single-select menus, sort, paging and toggles', () => {
  const state = roundTrip(
    searchV2PathBuilder({
      stream: 'IETF',
      area: 'Security Area',
      sort: 'publicationDate:desc',
      page: 3,
      perPage: 25,
      searchObsoleted: false,
      searchMetadataOnly: true
    })
  )
  expect(state.menu).toEqual({ 'stream.name': 'IETF', 'area.full': 'Security Area' })
  expect(state.sortBy).toBe('publicationDate:desc')
  expect(state.page).toBe(2) // 1-based in the URL, 0-based in UiState
  expect(state.hitsPerPage).toBe(25)
  expect(state.toggles).toEqual({ searchObsoleted: false, searchMetadataOnly: true })
})

test('searchV2PathBuilder round-trips a publication date range as unix seconds', () => {
  const from = new Date('1990-01-01T00:00:00Z')
  const to = new Date('1991-01-01T00:00:00Z')
  const href = searchV2PathBuilder({ published: { from, to } })
  expect(href).toBe('/search/?pubDate=631152000:662688000')
  expect(roundTrip(href).numericRefinements?.publicationDate).toEqual({ min: 631152000, max: 662688000 })

  const openEnded = searchV2PathBuilder({ published: { from } })
  expect(roundTrip(openEnded).numericRefinements?.publicationDate).toEqual({ min: 631152000, max: undefined })
})

test('searchV2PathBuilder returns a bare search path when given no params', () => {
  expect(searchV2PathBuilder({})).toBe('/search/')
  expect(roundTrip('/search/').refinements).toBeUndefined()
})

test('searchV2PathBuilder types the status vocabulary from the index schema', () => {
  // 'Not Issued' is a real index value that the legacy searchPathBuilder's union omits.
  expect(searchV2PathBuilder({ status: ['Not Issued'] })).toBe('/search/?status=Not+Issued')
  expect(roundTrip('/search/?status=Not+Issued').refinements?.['status.name']).toEqual(['Not Issued'])

  // Guards the derivation: if the union ever widened to `string` this directive would
  // itself become an error, so the test fails either way.
  // @ts-expect-error 'Nonexistent Status' is not a value the index can return
  searchV2PathBuilder({ status: ['Nonexistent Status'] })
})
