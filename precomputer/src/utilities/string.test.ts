// @vitest-environment node
import { test, expect } from 'vitest'
import { chunkString } from './string'
import { ensureWordBreaks } from '../tasks/rfc-html'
import { getDOMParser, rfcDocumentToPojo } from './dom'

test(`chunkString`, () => {
  const chunks = chunkString('abcdefghijklmnopqrstuvwxyz', 10)
  expect(chunks).toEqual(['abcdefghij', 'klmnopqrst', 'uvwxyz'])
})

test(`chunkString with url`, () => {
  const chunks = chunkString('https://www.example.com/path1/path2', 16)
  expect(chunks).toEqual(['https://', 'www', '.example', '.com', '/path1', '/path2'])

  const chunks2 = chunkString(
    'https://www.rfc-editor.org/search/rfc_search_detail.php?title=test&pubstatus%5B%5D=Any&pub_date_type=any',
    16
  )
  expect(chunks2).toEqual([
    'https://',
    'www',
    '.rfc',
    '-editor',
    '.org',
    '/search',
    '/rfc_',
    'search_',
    'detail',
    '.php',
    '?title',
    '=test',
    '&pubstatus',
    '%5B',
    '%5D',
    '=Any',
    '&pub_',
    'date_',
    'type',
    '=any'
  ])
})

test(`chunkString with underscores`, () => {
  // Break *after* the underscore so a wrapped line never starts with `_`
  // (ietf-tools/red#424).
  const chunks = chunkString('AROUND_THE_WORLD_AROUND_THE_WORLD', 16)
  expect(chunks).toEqual(['AROUND_', 'THE_', 'WORLD_', 'AROUND_', 'THE_', 'WORLD'])
})

test(`chunkString with camelCase`, () => {
  const chunks = chunkString(
    'aroundTheWorldAroundTheWorldAroundTheWorldAroundTheWorldAroundTheWorldAroundTheWorldAroundTheWorldAroundTheWorld',
    16
  )
  expect(chunks).toEqual([
    'around',
    'The',
    'World',
    'Around',
    'The',
    'World',
    'Around',
    'The',
    'World',
    'Around',
    'The',
    'World',
    'Around',
    'The',
    'World',
    'Around',
    'The',
    'World',
    'Around',
    'The',
    'World',
    'Around',
    'The',
    'World'
  ])

  const chunks2 = chunkString('DecodePacketNumber(largest_pn', 10)
  expect(chunks2).toEqual(['Decode', 'Packet', 'Number', '(largest_', 'pn'])
})

// Parse HTML and run ensureWordBreaks over it, returning the resulting pojo.
const applyWordBreaks = async (html: string): Promise<ReturnType<typeof rfcDocumentToPojo>> => {
  const parser = await getDOMParser()
  const dom = parser.parseFromString(html, 'text/html')
  const nodes = Array.from(dom.body.childNodes)
  ensureWordBreaks(nodes)
  return rfcDocumentToPojo(nodes)
}

// Serialize a pojo to a string, marking each <wbr> with `|`.
const serializeWbr = (pojo: ReturnType<typeof rfcDocumentToPojo>): string =>
  pojo
    .map((node) => {
      if (node.type === 'Text') {
        return node.textContent
      }
      if (node.nodeName === 'wbr') {
        return '|'
      }
      return serializeWbr(node.children)
    })
    .join('')

test('inserts <wbr> at identifier boundaries regardless of word length', async () => {
  // snake_case: break after the underscore (ietf-tools/red#424)
  expect(serializeWbr(await applyWordBreaks('<p>qualifier_set</p>'))).toBe('qualifier_|set')
  expect(serializeWbr(await applyWordBreaks('<p>valid_policy</p>'))).toBe('valid_|policy')
  expect(serializeWbr(await applyWordBreaks('<p>parent_nodes</p>'))).toBe('parent_|nodes')
  // camelCase: break before the hump. Both are exactly 16 chars — previously
  // skipped by the strict `length > 16` gate.
  expect(serializeWbr(await applyWordBreaks('<code>exclusiveMaximum</code>'))).toBe('exclusive|Maximum')
  expect(serializeWbr(await applyWordBreaks('<code>AddressComponent</code>'))).toBe('Address|Component')
})

test('leaves ordinary prose (incl. trailing punctuation) unbroken', async () => {
  expect(serializeWbr(await applyWordBreaks('<p>Information about the document.</p>'))).toBe(
    'Information about the document.'
  )
  expect(serializeWbr(await applyWordBreaks('<p>e.g. some text here</p>'))).toBe('e.g. some text here')
})

test('can break words', async () => {
  const parser = await getDOMParser()
  const dom = parser.parseFromString(
    '<a href="https://www.rfc-editor.org/info/rfc9618">https://www.rfc-editor.org/info/rfc9618</a>',
    'text/html'
  )
  const nodes = Array.from(dom.body.childNodes)
  ensureWordBreaks(nodes)
  const pojo = rfcDocumentToPojo(nodes)
  expect(pojo).toEqual([
    {
      type: 'Element',
      nodeName: 'a',
      attributes: {
        href: 'https://www.rfc-editor.org/info/rfc9618'
      },
      children: [
        {
          type: 'Text',
          textContent: 'https://'
        },
        {
          type: 'Element',
          nodeName: 'wbr',
          attributes: {},
          children: []
        },
        {
          type: 'Text',
          textContent: 'www'
        },
        {
          type: 'Element',
          nodeName: 'wbr',
          attributes: {},
          children: []
        },
        {
          type: 'Text',
          textContent: '.rfc'
        },
        {
          type: 'Element',
          nodeName: 'wbr',
          attributes: {},
          children: []
        },
        {
          type: 'Text',
          textContent: '-editor'
        },
        {
          type: 'Element',
          nodeName: 'wbr',
          attributes: {},
          children: []
        },
        {
          type: 'Text',
          textContent: '.org'
        },
        {
          type: 'Element',
          nodeName: 'wbr',
          attributes: {},
          children: []
        },
        {
          type: 'Text',
          textContent: '/info'
        },
        {
          type: 'Element',
          nodeName: 'wbr',
          attributes: {},
          children: []
        },
        {
          type: 'Text',
          textContent: '/rfc9618'
        }
      ]
    }
  ])
})

test('can break words (2)', async () => {
  const parser = await getDOMParser()
  const html =
    '<p id="section-boilerplate.1-3">Information about the current status of this document, any errata, and how to provide feedback on it may be obtained at <span><!--[--><!--[--><!--[--><a aria-current="page" href="/info/rfc9618" class="router-link-active router-link-exact-active" data-state="closed" data-grace-area-trigger=""><!--[--><!--[-->https://www.rfc-editor.org/info/rfc9618<!--]--><!--]--></a><!--teleport start--><!--teleport end--><!--]--><!--]--><!----><!--]--></span>.<a href="#section-boilerplate.1-3" class="pilcrow"><!--[--><!--[-->¶<!--]--><!--]--></a></p>'
  const dom = parser.parseFromString(html, 'text/html')
  const nodes = Array.from(dom.body.childNodes)
  ensureWordBreaks(nodes)
  const pojo = rfcDocumentToPojo(nodes)
  expect(pojo).toMatchSnapshot()
})
