// @vitest-environment node
import { test, expect, vi } from 'vitest'
import { applyScrapedAffiliations, scrapeAuthors } from './html-authors.ts'
import { getDOMParser } from './dom.ts'
import { type RfcCommon } from '../../../website/app/utilities/rfc-validators.ts'

const parse = async (html: string) => (await getDOMParser()).parseFromString(html, 'text/html')

const header = (authors: string) => `<dl id="identifiers"><dt>Authors:</dt><dd class="authors">${authors}</dd></dl>`
const author = (name: string, org?: string, editor = false) =>
  `<div class="author"><div class="author-name">${name}${editor ? ', <span class="editor">Ed.</span>' : ''}\n</div>${org === undefined ? '' : `<div class="org">${org}</div>`}</div>`

const rfcWith = (authors: RfcCommon['authors']) => ({ number: 1, authors }) as RfcCommon

test('scrapeAuthors reads names and orgs, dropping the editor suffix', async () => {
  const dom = await parse(header(author('J. Iyengar', 'Fastly', true) + author('M. Thomson', 'Mozilla')))
  expect(scrapeAuthors(dom)).toEqual([
    { name: 'J. Iyengar,', org: 'Fastly' },
    { name: 'M. Thomson', org: 'Mozilla' }
  ])
})

test('scrapeAuthors returns undefined without a header', async () => {
  expect(scrapeAuthors(await parse('<pre>Network Working Group</pre>'))).toBeUndefined()
})

test('scrapeAuthors gives null for an author with no org or an empty one', async () => {
  const dom = await parse(header(author('A. One') + author('B. Two', '  ')))
  expect(scrapeAuthors(dom)?.map(({ org }) => org)).toEqual([null, null])
})

test('applyScrapedAffiliations replaces affiliations, tolerating differing initials and accents', async () => {
  const dom = await parse(header(author('JC. Zúñiga', 'UPC') + author('B. Two')))
  const rfc = rfcWith([
    { titlepage_name: 'J. Zúñiga', affiliation: 'Cisco' },
    { titlepage_name: 'B. Two', affiliation: 'Later Corp' }
  ])
  expect(applyScrapedAffiliations(rfc, dom).authors.map(({ affiliation }) => affiliation)).toEqual(['UPC', undefined])
})

test('applyScrapedAffiliations keeps datatracker values when there is no header', async () => {
  const rfc = rfcWith([{ titlepage_name: 'A. One', affiliation: 'Cisco' }])
  expect(applyScrapedAffiliations(rfc, await parse('<pre></pre>'))).toBe(rfc)
})

test('applyScrapedAffiliations keeps datatracker values on an author count mismatch', async () => {
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  const rfc = rfcWith([{ titlepage_name: 'A. One', affiliation: 'Cisco' }])
  const dom = await parse(header(author('A. One', 'X') + author('B. Two', 'Y')))
  expect(applyScrapedAffiliations(rfc, dom)).toBe(rfc)
})

test('applyScrapedAffiliations keeps datatracker values on a surname mismatch', async () => {
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  const rfc = rfcWith([{ titlepage_name: 'A. One', affiliation: 'Cisco' }])
  expect(applyScrapedAffiliations(rfc, await parse(header(author('A. Other', 'X'))))).toBe(rfc)
})
