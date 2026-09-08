// @vitest-environment node
import path from 'path'
import fsPromises from 'fs/promises'
import { test, expect, vi } from 'vitest'
import {
  fetchSourceRfcHtml,
  markShortReferenceCitations,
  moveDefinitionIndentToCustomProperty,
  rfcBucketHtmlToRfcDocument
} from './rfc-html.ts'
import { getDOMParser, rfcDocumentToPojo } from '../utilities/dom.ts'
import { testMockAllRfcs, testMockErrataList } from '../utilities/rfcs-test-data.ts'
import { getFromS3 } from '../utilities/s3.ts'

const getRfcHtml: typeof getFromS3 = (_bucket, key, outputType, _prefixForDebug) => {
  const htmlPath = path.resolve(import.meta.dirname, '..', 'old-rfc-editor.org', key)
  return fsPromises.readFile(htmlPath, outputType === 'base64' ? 'base64' : 'utf-8')
}

const processRfcBucketHtml = async (rfcNumber: number) => {
  const date = new Date(2025, 0, 14)
  vi.setSystemTime(date)

  const html = await fetchSourceRfcHtml(rfcNumber, getRfcHtml)

  const getRfcCommon = async (_rfcNumber: number) => testMockAllRfcs[testMockAllRfcs.length - 1]

  const getErrataByRfcNumber = async (rfcNumber: number) =>
    testMockErrataList.filter((errataItem) => errataItem['doc-id'] === `RFC${rfcNumber}`)

  if (html) {
    return rfcBucketHtmlToRfcDocument({
      rfcBucketHtml: html,
      rfcNumber,
      getRfcCommon,
      getErrataList: getErrataByRfcNumber
    })
  }
}

const RFC_NUMBER_WITH_PLAINTEXT = 2000
const RFC_NUMBER_WITH_XML2RFC_HTML = 9000

test(`processRfcBucketHtml(${RFC_NUMBER_WITH_PLAINTEXT}) RFC without TOC`, async () => {
  const rfcBucketHtmlDocument = await processRfcBucketHtml(RFC_NUMBER_WITH_PLAINTEXT)

  expect(rfcBucketHtmlDocument).toMatchSnapshot()

  expect(rfcBucketHtmlDocument?.tableOfContents).toBeTruthy()
})

test(`processRfcBucketHtml(${RFC_NUMBER_WITH_XML2RFC_HTML}) RFC with TOC`, async () => {
  const rfcBucketHtmlDocument = await processRfcBucketHtml(RFC_NUMBER_WITH_XML2RFC_HTML)
  expect(rfcBucketHtmlDocument).toMatchSnapshot()
  expect(rfcBucketHtmlDocument?.tableOfContents).toBeTruthy()
})

// Every `dd` attribute set in `html`, as the indent transform leaves them.
const definitionAttributesAfterMovingIndent = async (html: string): Promise<Record<string, string>[]> => {
  const parser = await getDOMParser()
  const dom = parser.parseFromString(html, 'text/html')
  const nodes = Array.from(dom.body.childNodes)
  moveDefinitionIndentToCustomProperty(nodes)

  const attributesOf = (pojo: ReturnType<typeof rfcDocumentToPojo>): Record<string, string>[] =>
    pojo.flatMap((node) => {
      if (node.type !== 'Element') {
        return []
      }
      return [...(node.nodeName === 'dd' ? [node.attributes] : []), ...attributesOf(node.children)]
    })

  return attributesOf(rfcDocumentToPojo(nodes))
}

test('moves the xml2rfc hanging indent from an inline margin to a custom property', async () => {
  expect(
    await definitionAttributesAfterMovingIndent('<dl><dt>Term</dt><dd style="margin-left:7.0em">Definition</dd></dl>')
  ).toEqual([{ class: 'dd-ml', style: '--dd-ml:7.0em' }])
})

test('keeps other inline declarations and existing classes', async () => {
  expect(
    await definitionAttributesAfterMovingIndent(
      '<dl><dt>Term</dt><dd class="break" style="color:red;margin-left:1.5em">Definition</dd></dl>'
    )
  ).toEqual([{ class: 'break dd-ml', style: 'color:red;--dd-ml:1.5em' }])
})

test('leaves definitions without an inline indent untouched', async () => {
  expect(
    await definitionAttributesAfterMovingIndent('<dl><dt>Term</dt><dd class="break">Definition</dd></dl>')
  ).toEqual([{ class: 'break' }])
})

test('leaves inline margins on other elements untouched', async () => {
  const parser = await getDOMParser()
  const dom = parser.parseFromString('<div style="margin-left:4em">Not a definition</div>', 'text/html')
  const nodes = Array.from(dom.body.childNodes)
  moveDefinitionIndentToCustomProperty(nodes)

  expect(rfcDocumentToPojo(nodes)).toEqual([
    expect.objectContaining({ nodeName: 'div', attributes: { style: 'margin-left:4em' } })
  ])
})

// Every span in `html` with its text and class, as the citation transform leaves them.
const referenceCitationSpansAfterMarking = async (html: string): Promise<{ text: string; class: string }[]> => {
  const parser = await getDOMParser()
  const dom = parser.parseFromString(html, 'text/html')
  const nodes = Array.from(dom.body.childNodes)
  markShortReferenceCitations(nodes)

  const spansOf = (pojo: ReturnType<typeof rfcDocumentToPojo>): { text: string; class: string }[] =>
    pojo.flatMap((node) => {
      if (node.type !== 'Element') {
        return []
      }
      const textOf = (n: typeof node): string =>
        n.children.map((c) => (c.type === 'Text' ? c.textContent : c.type === 'Element' ? textOf(c) : '')).join('')
      return [
        ...(node.nodeName === 'span' ? [{ text: textOf(node), class: node.attributes.class ?? '' }] : []),
        ...spansOf(node.children)
      ]
    })

  return spansOf(rfcDocumentToPojo(nodes))
}

const referenceCitation = (name: string) => `<p><span>[<a href="#${name}" class="xref">${name}</a>]</span></p>`

test('marks a bracketed citation that fits on one line', async () => {
  expect(await referenceCitationSpansAfterMarking(referenceCitation('RFC3629'))).toEqual([
    { text: '[RFC3629]', class: 'reference-citation' }
  ])
  expect(await referenceCitationSpansAfterMarking(referenceCitation('OAM-CONS'))).toEqual([
    { text: '[OAM-CONS]', class: 'reference-citation' }
  ])
})

test('leaves a citation too wide to hold together', async () => {
  // 10.2em measured: wider than a narrow column offers at 200% text.
  expect(await referenceCitationSpansAfterMarking(referenceCitation('NIST-SP-800-133r2'))).toEqual([
    { text: '[NIST-SP-800-133r2]', class: '' }
  ])
})

test('measures width rather than counting characters', async () => {
  // Both are 15 characters inside the brackets; only the lowercase one fits.
  expect(await referenceCitationSpansAfterMarking(referenceCitation('QUIC-RECOVERY'))).toEqual([
    { text: '[QUIC-RECOVERY]', class: '' }
  ])
  expect(await referenceCitationSpansAfterMarking(referenceCitation('quic-recovery'))).toEqual([
    { text: '[quic-recovery]', class: 'reference-citation' }
  ])
})

test('leaves citations alone where they render wider than body text', async () => {
  const inBold = `<p><strong><span>[<a href="#RFC3629" class="xref">RFC3629</a>]</span></strong></p>`
  expect(await referenceCitationSpansAfterMarking(inBold)).toEqual([{ text: '[RFC3629]', class: '' }])
})

test('ignores spans that are not a bracketed citation', async () => {
  const twoLinks = `<p><span>[<a href="#A">A</a>, <a href="#B">B</a>]</span></p>`
  const noBrackets = `<p><span><a href="#A" class="xref">A</a></span></p>`
  const plainText = `<p><span>[not a link]</span></p>`
  expect((await referenceCitationSpansAfterMarking(twoLinks))[0].class).toBe('')
  expect((await referenceCitationSpansAfterMarking(noBrackets))[0].class).toBe('')
  expect((await referenceCitationSpansAfterMarking(plainText))[0].class).toBe('')
})

test('keeps an existing class on the span', async () => {
  const withClass = `<p><span class="refs">[<a href="#RFC3629" class="xref">RFC3629</a>]</span></p>`
  expect((await referenceCitationSpansAfterMarking(withClass))[0].class).toBe('refs reference-citation')
})
