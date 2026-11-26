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

test('scrapeAuthors reads the org of each author', async () => {
  const dom = await parse(header(author('J. Iyengar', 'Fastly', true) + author('M. Thomson', 'Mozilla')))
  expect(scrapeAuthors(dom)).toEqual(['Fastly', 'Mozilla'])
})

test('scrapeAuthors uses the ascii rendering of an org written in another script', async () => {
  const dom = await parse(
    header(
      '<div class="author"><div class="author-name">\n<span class="non-ascii">郑好棉</span> (<span class="ascii">H. Zheng</span>)</div><div class="org">\n<span class="non-ascii">华为技术有限公司</span> (<span class="ascii">Huawei Technologies</span>)</div></div>'
    )
  )
  expect(scrapeAuthors(dom)).toEqual(['Huawei Technologies'])
})

test('scrapeAuthors returns undefined without a header', async () => {
  expect(scrapeAuthors(await parse('<pre>Network Working Group</pre>'))).toBeUndefined()
})

test('scrapeAuthors gives null for an author with no org or an empty one', async () => {
  const dom = await parse(header(author('A. One') + author('B. Two', '  ')))
  expect(scrapeAuthors(dom)).toEqual([null, null])
})

test('applyScrapedAffiliations replaces affiliations, whatever the spelling of the names', async () => {
  const dom = await parse(header(author('JC. Zúñiga 3rd', 'UPC') + author('B. Two')))
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
