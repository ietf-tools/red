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
  expect(chunks).toEqual([
    'https://',
    'www',
    '.example',
    '.com',
    '/path1',
    '/path2'
  ])

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
    '/rfc',
    '_search',
    '_detail',
    '.php',
    '?title',
    '=test',
    '&pubstatus',
    '%5B',
    '%5D',
    '=Any',
    '&pub',
    '_date',
    '_type',
    '=any'
  ])
})

test(`chunkString with underscores`, () => {
  const chunks = chunkString('AROUND_THE_WORLD_AROUND_THE_WORLD', 16)
  expect(chunks).toEqual([
    'AROUND',
    '_THE',
    '_WORLD',
    '_AROUND',
    '_THE',
    '_WORLD'
  ])
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
  expect(chunks2).toEqual(['Decode', 'Packet', 'Number', '(largest', '_pn'])
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
        },
        {
          type: 'Element',
          nodeName: 'wbr',
          attributes: {},
          children: []
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
