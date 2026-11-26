import { describe, expect, test } from 'vitest'
import { GROUP_DOMAINS, linkRel, urlDestination } from './url-destination'

describe('urlDestination', () => {
  test.each([
    ['/info/rfc9000/', 'internal'],
    ['/authors/rfc-independent-submissions/', 'internal'],
    ['#section-1', 'internal'],
    ['mailto:rfc-editor@rfc-editor.org', 'internal'],
    ['tel:+15551234567', 'internal']
  ])('%s is internal', (href, expected) => {
    expect(urlDestination(href)).toBe(expected)
  })

  test.each([
    'https://www.ietf.org/',
    'https://datatracker.ietf.org/',
    'https://datatracker.ietf.org/doc/rfc9000/',
    'https://mailarchive.ietf.org/arch/',
    'https://ietf.org/',
    'https://www.irtf.org/',
    'https://irtf.org/',
    'https://www.iab.org/',
    'https://iab.org/',
    'https://www.rfc-editor.org/rfc/rfc9000.html',
    'https://errata.rfc-editor.org/',
    'https://mailman3.rfc-editor.org/',
    'http://www.ietf.org/',
    'https://WWW.IETF.ORG/',
    'HTTPS://www.ietf.org/',
    'https://www.ietf.org:8443/',
    'https://www.ietf.org/path?query=1#hash'
  ])('%s is in the group', (href) => {
    expect(urlDestination(href)).toBe('group')
  })

  test.each([
    'https://www.nist.gov/',
    'https://web.archive.org/web/2020/https://www.ietf.org/',
    'https://www.iana.org/',
    'https://www.iab.com/',
    // Looks like a group domain but is not one
    'https://evilietf.org/',
    'https://notrfc-editor.org/',
    'https://ietf.org.example.com/',
    'https://www.ietf.org.example.com/',
    'https://example.com/www.ietf.org',
    'https://example.com/?next=https://www.ietf.org/',
    // The host is what follows the `@`
    'https://www.ietf.org@example.com/',
    'https://www.ietf.org:password@example.com/',
    // Not a valid URL
    'https://',
    'http://'
  ])('%s is outside', (href) => {
    expect(urlDestination(href)).toBe('outside')
  })

  test('a host written with a trailing dot is not matched, so is treated as outside', () => {
    expect(urlDestination('https://www.ietf.org./')).toBe('outside')
  })

  test('every group domain is lower case, because the URL parser lower-cases the host it is compared with', () => {
    expect(GROUP_DOMAINS.filter((domain) => domain !== domain.toLowerCase())).toEqual([])
  })
})

describe('linkRel', () => {
  test.each([
    ['https://www.ietf.org/', 'a site in the group'],
    ['https://datatracker.ietf.org/wg/quic', 'a datatracker page'],
    ['https://www.nist.gov/', 'a site outside the group'],
    ['https://ietf.org@example.com/', 'a lookalike host']
  ])('%s (%s) is kept from controlling this page', (href) => {
    expect(linkRel(href)).toBe('noopener')
  })

  test.each(['/info/rfc9000/', '#section-1', 'mailto:rfc-editor@rfc-editor.org'])('%s has no rel', (href) => {
    expect(linkRel(href)).toBeUndefined()
  })
})
