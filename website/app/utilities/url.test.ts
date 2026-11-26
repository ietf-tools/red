// @vitest-environment nuxt
import { test, expect } from 'vitest'
import {
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
  isHashLink,
  subjectsPathBuilder,
  sanitiseUserProfileImage,
  apiMarkdownPagePathBuilder,
  areaGroupUrlBuilder,
  datatrackerAuthorUrlBuilder,
  doiUrlBuilder,
  metaThumbnailPathBuilder,
  useDatatrackerUrlOrigin,
  useErrataUrlBuilder,
  useWorkingGroupUrlBuilder
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

test('subjectsPathBuilder: path safe encoding', () => {
  expect(subjectsPathBuilder('http/2')).toBe('/subjects/http%2F2/')
})

test('sanitiseUserProfileImage: accepts https URLs, trimming surrounding whitespace', () => {
  expect(sanitiseUserProfileImage('https://example.com/avatar.png')).toEqual('https://example.com/avatar.png')
  expect(sanitiseUserProfileImage('  https://example.com/avatar.png  ')).toEqual('https://example.com/avatar.png')
})

test('sanitiseUserProfileImage: rejects missing/empty values', () => {
  expect(sanitiseUserProfileImage(undefined)).toEqual(undefined)
  expect(sanitiseUserProfileImage(null)).toEqual(undefined)
  expect(sanitiseUserProfileImage('')).toEqual(undefined)
  expect(sanitiseUserProfileImage('   ')).toEqual(undefined)
})

test('sanitiseUserProfileImage: rejects non-https schemes', () => {
  expect(sanitiseUserProfileImage('http://example.com/avatar.png')).toEqual(undefined)
  expect(sanitiseUserProfileImage('javascript:alert(1)')).toEqual(undefined)
  expect(sanitiseUserProfileImage('data:image/png;base64,aGVsbG8=')).toEqual(undefined)
  expect(sanitiseUserProfileImage('ftp://example.com/avatar.png')).toEqual(undefined)
})

test('sanitiseUserProfileImage: rejects unparseable URLs', () => {
  expect(sanitiseUserProfileImage('not a url')).toEqual(undefined)
})

test('sanitiseUserProfileImage: rejects oversized values, accepts values right at the limit', () => {
  const path = 'a'.repeat(2048 - 'https://example.com/'.length)
  const atLimit = `https://example.com/${path}`
  expect(atLimit.length).toEqual(2048)
  expect(sanitiseUserProfileImage(atLimit)).toEqual(atLimit)
  expect(sanitiseUserProfileImage(`${atLimit}a`)).toEqual(undefined)
})

test("datatrackerAuthorUrlBuilder keeps the path's own encoding", () => {
  expect(datatrackerAuthorUrlBuilder('/person/Jana%20Iyengar')).toEqual(
    `${useDatatrackerUrlOrigin()}/person/Jana%20Iyengar`
  )
})

test('datatrackerAuthorUrlBuilder refuses a path that would change the host', () => {
  expect(() => datatrackerAuthorUrlBuilder('@evil.example/x')).toThrow()
  expect(() => datatrackerAuthorUrlBuilder('.evil.example/x')).toThrow()
  expect(() => datatrackerAuthorUrlBuilder('//evil.example/x')).toThrow()
  expect(() => datatrackerAuthorUrlBuilder('/\\evil.example/x')).toThrow()
  expect(() => datatrackerAuthorUrlBuilder('https://evil.example/x')).toThrow()
})

test('useWorkingGroupUrlBuilder encodes the acronym', () => {
  const group = (acronym: string) => ({ acronym, name: 'Name', type: 'wg' as const })
  expect(useWorkingGroupUrlBuilder(group('quic'), 'about')).toEqual(`${useDatatrackerUrlOrigin()}/wg/quic/about/`)
  expect(useWorkingGroupUrlBuilder(group('a/../b?c#d'))).toEqual(`${useDatatrackerUrlOrigin()}/wg/a%2F..%2Fb%3Fc%23d`)
})

test('useWorkingGroupUrlBuilder uses the datatracker path for the group type', () => {
  const origin = useDatatrackerUrlOrigin()
  const group = (type: 'wg' | 'rg' | 'edwg' | 'ag') => ({ acronym: 'abc', name: 'Name', type })
  expect(useWorkingGroupUrlBuilder(group('wg'), 'documents')).toEqual(`${origin}/wg/abc/documents/`)
  expect(useWorkingGroupUrlBuilder(group('rg'), 'about')).toEqual(`${origin}/rg/abc/about/`)
  expect(useWorkingGroupUrlBuilder(group('edwg'), 'meetings')).toEqual(`${origin}/edwg/abc/meetings/`)
  expect(useWorkingGroupUrlBuilder(group('ag'), 'about')).toEqual(`${origin}/group/abc/about/`)
})

test('areaGroupUrlBuilder encodes the acronym', () => {
  expect(areaGroupUrlBuilder({ acronym: 'sec', name: 'Security' })).toEqual(`${useDatatrackerUrlOrigin()}/wg/#SEC`)
  expect(areaGroupUrlBuilder({ acronym: 'a#b?c', name: 'Name' })).toEqual(`${useDatatrackerUrlOrigin()}/wg/#A%23B%3FC`)
})

test('useErrataUrlBuilder encodes the id', () => {
  expect(useErrataUrlBuilder('1234')).toEqual('https://errata.rfc-editor.org/eid1234/')
  expect(useErrataUrlBuilder('1/../x?y#z')).toEqual('https://errata.rfc-editor.org/eid1%2F..%2Fx%3Fy%23z/')
})

test('doiUrlBuilder encodes each segment but keeps the slashes', () => {
  expect(doiUrlBuilder('10.17487/RFC9000', true)).toEqual('https://doi.org/10.17487/RFC9000')
  expect(doiUrlBuilder('10.1000/a?b=c#d', true)).toEqual('https://doi.org/10.1000/a%3Fb%3Dc%23d')
})

test('apiMarkdownPagePathBuilder encodes each segment and refuses dot segments', () => {
  expect(apiMarkdownPagePathBuilder('authors/rfc-style-guide')).toEqual('/api/v1/content/authors/rfc-style-guide.json')
  expect(apiMarkdownPagePathBuilder('a b/c?d')).toEqual('/api/v1/content/a%20b/c%3Fd.json')
  expect(() => apiMarkdownPagePathBuilder('../secret')).toThrow()
  expect(() => apiMarkdownPagePathBuilder('a/./b')).toThrow()
})

test('metaThumbnailPathBuilder only takes a series id', () => {
  expect(metaThumbnailPathBuilder('rfc9000')).toEqual('/api/v1/meta-thumbnail/rfc9000.png')
  expect(metaThumbnailPathBuilder('RFC9000')).toEqual('/api/v1/meta-thumbnail/rfc9000.png')
  expect(() => metaThumbnailPathBuilder('../x')).toThrow()
})
