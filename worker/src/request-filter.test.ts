// @vitest-environment node
import { test, expect } from 'vitest'
import { isBlockedPhpPath, isBogusPath, isNuxtIslandPath, isOriginPath } from './request-filter'

/**
 * Paths whose shape rules them out before any route gets to look at them.
 */
const BOGUS_PATHS = [
  // Characters no route on this site uses. The first is from a real report:
  // it reached the origin and rendered 'No "rfc9266>." page found.'
  '/info/rfc9266>./',
  '/info/rfc9266%3E./',
  '/search/?q=<script>alert(1)</script>',
  "/rfc/rfc'9266.txt",
  '/rfc/rfc 9266.txt',
  '/rfc\\rfc9266.txt',
  '/rfc/rfc9266%00.txt',
  '/rfc/rfc9266 .txt',
  // Malformed percent-encoding
  '/rfc/%ZZ',
  '/api/v1/rfc/%E0%A4%A',
  // Empty and relative segments
  '/info//rfc9266',
  '//info/rfc9266',
  '/rfc/%2e%2e/etc/passwd',
  '/rfc/%2e/rfc9266.txt',
  // Absurd shapes
  `/${'a'.repeat(600)}`,
  `/${Array.from({ length: 20 }, (_, index) => `segment${index}`).join('/')}`
]

/**
 * Real paths, and paths that merely look odd. Between them these cover every
 * character class the routes in `index.ts` actually use — this is the half of
 * the suite that stops the filter quietly eating a live route.
 */
const WELL_FORMED_PATHS = [
  '/',
  '/info/rfc9266/',
  '/info/rfc9266',
  '/rfc/rfc9266.txt',
  '/rfc/rfc9266.pdf',
  '/rfc/inline-errata/rfc9266.html',
  '/refs/ref9266.txt',
  '/api/v1/rfc-common/9266.json',
  '/api/v1/favicon/32x32.png',
  '/_nuxt/1.2.3/entry.js',
  '/sitemap-1.xml',
  '/errata_search.php',
  '/search/rfc_search_detail.php',
  '/status_changes.php',
  // Uppercase is in real routes, so a lowercase-only character rule would be wrong
  '/materials/format/SVG-1.2-RFC.rnc',
  '/reports/CurrQstats.txt',
  '/auth48/C123',
  '/rfc/RFC9266.TXT',
  // Encoded but benign
  '/rfc/rfc9266%2Etxt'
]

test('isBogusPath: rejects paths no route could match', () => {
  for (const path of BOGUS_PATHS) {
    expect(isBogusPath(path), path).toBe(true)
  }
})

test('isBogusPath: accepts well-formed paths', () => {
  for (const path of WELL_FORMED_PATHS) {
    expect(isBogusPath(path), path).toBe(false)
  }
})

test('isBlockedPhpPath: blocks anything still carrying .php', () => {
  // The legitimate `.php` routes are matched above this gate and never reach it,
  // so what's left is scans and mangled links.
  expect(isBlockedPhpPath('/errata_search.php./rfc4641')).toBe(true)
  expect(isBlockedPhpPath('/errata_search.php/rfc4641')).toBe(true)
  expect(isBlockedPhpPath('/wp-login.php')).toBe(true)
  expect(isBlockedPhpPath('/staff/nonexistent.php')).toBe(true)
  expect(isBlockedPhpPath('/vendor/phpunit/phpunit/src/Util/PHP/eval-stdin.php')).toBe(true)
  expect(isBlockedPhpPath('/index.PHP')).toBe(true)
})

test('isBlockedPhpPath: leaves everything else alone', () => {
  expect(isBlockedPhpPath('/info/rfc9266')).toBe(false)
  expect(isBlockedPhpPath('/rfc/rfc9266.txt')).toBe(false)
  expect(isBlockedPhpPath('/series/rfc-phpx')).toBe(false)
})

test('isOriginPath: forwards the pages the Nuxt origin renders', () => {
  // `addNormalizedPath` has stripped the trailing slash by the time these are
  // tested, so the homepage is an empty string.
  const originPaths = [
    '',
    '/about',
    '/about/rfc-editor',
    '/account',
    '/authors/rfc-style-guide',
    '/images/authors/rfc-how-to-flowchart.png',
    '/never-issued',
    '/rfc-index',
    '/search',
    '/series/rfc-errata',
    '/series/errata/how-to-verify',
    '/set',
    '/status-changes',
    '/api/v1/healthcheck.json',
    '/api/v1/systemcheck.json',
    // Every series type the `/info/` page parses, leading zeros allowed
    '/info/rfc9266',
    '/info/rfc0009',
    '/info/bcp78',
    '/info/fyi3',
    '/info/std3',
    // The origin resolves these today, so the worker has to keep forwarding them
    '/Search',
    '/INFO/RFC9266',
    // Islands. Nothing uses one yet — these are here so the first one added works.
    '/__nuxt_island/RfcIndexTable_2f8a91c0.json',
    '/__nuxt_island/rfc-document_9d41ba.json'
  ]
  for (const path of originPaths) {
    expect(isOriginPath(path), path).toBe(true)
  }
})

test('isOriginPath: refuses everything else', () => {
  const nonOriginPaths = [
    // The examples from the report. Every file the site serves comes from R2 via
    // a route above this gate, so a path with an extension reaching here is junk.
    '/pdfrfc/rfc5942.txt.pdf',
    '/errata_search.php./rfc4641',
    '/.env',
    '/.git/config',
    '/backup.zip',
    '/robots.txt',
    // `/info/` takes a series id and nothing else
    '/info',
    '/info/rfc9266.txt',
    '/info/draft-ietf-something',
    '/info/rfc',
    '/info/rfc9266/extra',
    // Prefix matching is segment-aware, not a bare `startsWith`
    '/aboutus',
    '/searchengine',
    '/setup',
    // R2-served namespaces: a miss there is a worker 404, not an origin round-trip
    '/_nuxt/missing.js',
    '/refs/missing.txt',
    '/api/v1/rfc/bogus',
    '/api/v1/anything-else.json',
    // A case variant of an R2-served route still isn't the origin's to answer
    '/RFC/rfc9266.txt',
    // The island namespace is no more open than any other
    '/__nuxt_island/',
    '/__nuxt_island/no-hash.json',
    '/__nuxt_island/RfcIndexTable_2f8a91c0',
    '/__nuxt_island/RfcIndexTable_2f8a91c0.json/extra'
  ]
  for (const path of nonOriginPaths) {
    expect(isOriginPath(path), path).toBe(false)
  }
})

test('isNuxtIslandPath: matches the URLs <NuxtIsland> actually requests', () => {
  // `<Name>_<hash>.json`, per Nuxt's own `isValidIslandKey`
  expect(isNuxtIslandPath('/__nuxt_island/RfcIndexTable_2f8a91c0.json')).toBe(true)
  expect(isNuxtIslandPath('/__nuxt_island/rfc-document_9d41ba.json')).toBe(true)
  // Nothing else in that namespace
  expect(isNuxtIslandPath('/__nuxt_island/')).toBe(false)
  expect(isNuxtIslandPath('/__nuxt_island/no-hash.json')).toBe(false)
  expect(isNuxtIslandPath('/__nuxt_island/_leadingunderscore.json')).toBe(false)
  expect(isNuxtIslandPath('/__nuxt_island/9startsWithDigit_abc.json')).toBe(false)
  expect(isNuxtIslandPath('/__nuxt_island/RfcIndexTable_2f8a91c0')).toBe(false)
  expect(isNuxtIslandPath(`/__nuxt_island/a_${'0'.repeat(120)}.json`)).toBe(false)
  expect(isNuxtIslandPath('/info/rfc9266')).toBe(false)
})
