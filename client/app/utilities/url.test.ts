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
  parseMaybeRfcLink,
  isHashLink
} from './url'
import type { ValidHrefs } from './url'

/**
 * Should error if ValidHrefs type becomes overly broad (ie `string` or
 * `any`) so it matches a non-existent href, hence the variable name.
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
  expect(rfcCitePathBuilder('rfc9000', 'txt')).toEqual('/refs/rfc9000.txt')
  expect(rfcCitePathBuilder('RFC9000', 'txt')).toEqual('/refs/rfc9000.txt')
})

test('rfcCitePathBuilder: xml', () => {
  expect(rfcCitePathBuilder('rfc9000', 'xml')).toEqual(
    'https://bib.ietf.org/public/rfc/bibxml/reference.RFC.9000.xml'
  )
  expect(rfcCitePathBuilder('RFC9000', 'xml')).toEqual(
    'https://bib.ietf.org/public/rfc/bibxml/reference.RFC.9000.xml'
  )
})

test('rfcCitePathBuilder: bibTeX', () => {
  expect(rfcCitePathBuilder('rfc9000', 'bibTeX')).toEqual(
    'https://datatracker.ietf.org/doc/rfc9000/bibtex/'
  )
  expect(rfcCitePathBuilder('RFC9000', 'bibTeX')).toEqual(
    'https://datatracker.ietf.org/doc/rfc9000/bibtex/'
  )
})

test('rfcFormatPathBuilder: html', () => {
  expect(rfcFormatPathBuilder('rfc9000', 'html')).toEqual('/rfc/rfc9000.html')
  expect(rfcFormatPathBuilder('RFC9000', 'html')).toEqual('/rfc/rfc9000.html')
})

test('textToAnchorId', () => {
  expect(
    textToAnchorId('What Sort Of Documents Are Independent Submissions?')
  ).toEqual('what-sort-of-documents-are-independent-submissions')

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
    type: 'RFC',
    number: '1'
  })

  expect(parseMaybeRfcLink('/rfc/rfc10101')).toEqual({
    type: 'RFC',
    number: '10101'
  })

  expect(parseMaybeRfcLink('https://www.rfc-editor.org/rfc/rfc10101')).toEqual({
    type: 'RFC',
    number: '10101'
  })

  expect(
    parseMaybeRfcLink('https://www.rfc-editor.org/rfc/rfc10101#section-2.1')
  ).toEqual({
    type: 'RFC',
    number: '10101'
  })

  expect(parseMaybeRfcLink('#rfc10101')).toEqual({
    type: 'RFC',
    number: '10101'
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
