// @vitest-environment node
import { test, expect } from 'vitest'
import { chunkString } from './string'
import { ensureWordBreaks } from '../tasks/rfc-html'
import { getDOMParser, rfcDocumentToPojo } from './dom'

const NO_MINIMUM_FRAGMENT = 1

test(`chunkString`, () => {
  // 26 letters is longer than any word expected whole, so it is treated as machine data and
  // subdivided — shared evenly between its pieces rather than filled to the limit with a short
  // remainder, so 26 characters at 10 gives 9/9/8 rather than 10/10/6.
  expect(chunkString('abcdefghijklmnopqrstuvwxyz', 10, NO_MINIMUM_FRAGMENT)).toEqual([
    'abcdefghi',
    'jklmnopqr',
    'stuvwxyz'
  ])

  // Digits make a run machine data at any length.
  expect(chunkString('a1b2c3d4e5f6g7h8i9j0k1l2m3', 10, NO_MINIMUM_FRAGMENT)).toEqual([
    'a1b2c3d4e',
    '5f6g7h8i9',
    'j0k1l2m3'
  ])
})

test(`chunkString with url`, () => {
  const chunks = chunkString('https://www.example.com/path1/path2', 16, NO_MINIMUM_FRAGMENT)
  expect(chunks).toEqual(['https://', 'www', '.example', '.com', '/path1', '/path2'])

  const chunks2 = chunkString(
    'https://www.rfc-editor.org/search/rfc_search_detail.php?title=test&pubstatus%5B%5D=Any&pub_date_type=any',
    16,
    NO_MINIMUM_FRAGMENT
  )
  expect(chunks2).toEqual([
    'https://',
    'www',
    '.rfc-',
    'editor',
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

test('breaks after a hyphen, not before it', () => {
  // A wrapped line must not begin with a hyphen, so hyphens end their chunk, as underscores do
  // (https://github.com/ietf-tools/red/issues/424).
  expect(chunkString('draft-ietf-quic-manageability-11', 10, NO_MINIMUM_FRAGMENT)).toEqual([
    'draft-',
    'ietf-',
    'quic-',
    'manageability-',
    '11'
  ])
  // A hyphen mixed with another separator keeps the break before the run, since the run no longer
  // reads as a hyphenated compound.
  expect(chunkString('a-(b', 10, NO_MINIMUM_FRAGMENT)).toEqual(['a', '-(b'])
})

test('does not break a slash that joins two ordinary words', () => {
  // Prose: a line may not begin with `/`, and these need no break to fit.
  expect(chunkString('and/or', 10, NO_MINIMUM_FRAGMENT)).toEqual(['and/or'])
  expect(chunkString('request/response', 10, NO_MINIMUM_FRAGMENT)).toEqual(['request/response'])
  expect(chunkString('N/A', 10, NO_MINIMUM_FRAGMENT)).toEqual(['N/A'])
  expect(chunkString('request/response,', 10, NO_MINIMUM_FRAGMENT)).toEqual(['request/response,'])

  // Machine strings still break at their slashes: a segment carrying digits or a dot is not a word.
  expect(chunkString('10.7551/mitpress', 10, NO_MINIMUM_FRAGMENT)).toEqual(['10', '.7551', '/mitpress'])
  expect(chunkString('example.com/path', 10, NO_MINIMUM_FRAGMENT)).toEqual(['example', '.com', '/path'])
})

test(`chunkString with underscores`, () => {
  // Break *after* the underscore so a wrapped line never starts with `_`
  // (https://github.com/ietf-tools/red/issues/424).
  const chunks = chunkString('AROUND_THE_WORLD_AROUND_THE_WORLD', 16, NO_MINIMUM_FRAGMENT)
  expect(chunks).toEqual(['AROUND_', 'THE_', 'WORLD_', 'AROUND_', 'THE_', 'WORLD'])
})

test(`chunkString with camelCase`, () => {
  const chunks = chunkString(
    'aroundTheWorldAroundTheWorldAroundTheWorldAroundTheWorldAroundTheWorldAroundTheWorldAroundTheWorldAroundTheWorld',
    16,
    NO_MINIMUM_FRAGMENT
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

  // `pn` keeps its own chunk despite being under the minimum: it follows an underscore, so it is a
  // segment of `largest_pn` rather than a fragment of a word. See `mergeShortChunks`.
  const chunks2 = chunkString('DecodePacketNumber(largest_pn', 10, 3)
  expect(chunks2).toEqual(['Decode', 'Packet', 'Number', '(largest_', 'pn'])
})

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
  // snake_case: break after the underscore (https://github.com/ietf-tools/red/issues/424)
  expect(serializeWbr(await applyWordBreaks('<p>qualifier_set</p>'))).toBe('qualifier_|set')
  expect(serializeWbr(await applyWordBreaks('<p>valid_policy</p>'))).toBe('valid_|policy')
  expect(serializeWbr(await applyWordBreaks('<p>parent_nodes</p>'))).toBe('parent_|nodes')
  // camelCase: break before the hump.
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
          attributes: { class: 'wordsize-24' },
          children: []
        },
        {
          type: 'Text',
          textContent: 'www'
        },
        {
          type: 'Element',
          nodeName: 'wbr',
          attributes: { class: 'wordsize-24' },
          children: []
        },
        {
          type: 'Text',
          textContent: '.rfc-'
        },
        {
          type: 'Element',
          nodeName: 'wbr',
          attributes: { class: 'wordsize-24' },
          children: []
        },
        {
          type: 'Text',
          textContent: 'editor'
        },
        {
          type: 'Element',
          nodeName: 'wbr',
          attributes: { class: 'wordsize-24' },
          children: []
        },
        {
          type: 'Text',
          textContent: '.org'
        },
        {
          type: 'Element',
          nodeName: 'wbr',
          attributes: { class: 'wordsize-24' },
          children: []
        },
        {
          type: 'Text',
          textContent: '/info'
        },
        {
          type: 'Element',
          nodeName: 'wbr',
          attributes: { class: 'wordsize-24' },
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

test('the length gate does not depend on where a word sits', async () => {
  // Leading whitespace is not part of a word's length, so the same word breaks identically
  // mid-sentence and as an element's first word.
  expect(serializeWbr(await applyWordBreaks('<p>client-initiated</p>'))).toBe('client-|initiated')
  expect(serializeWbr(await applyWordBreaks('<p>a client-initiated</p>'))).toBe('a client-|initiated')
  // 17 letters qualifies on length but is left whole in both positions: a run of letters reads as
  // a word, and splitting one mid-word is the orphaning this is meant to avoid. Machine strings of
  // the same length do get subdivided — see the chunkString tests.
  expect(serializeWbr(await applyWordBreaks('<p>abcdefghijklmnopq</p>'))).toBe('abcdefghijklmnopq')
  expect(serializeWbr(await applyWordBreaks('<p>a abcdefghijklmnopq</p>'))).toBe('a abcdefghijklmnopq')
  // Position independence still holds where a break does apply.
  expect(serializeWbr(await applyWordBreaks('<p>a1b2c3d4e5f6g7h8i</p>'))).toBe('a1b2c3d4e|5f6g7h8i')
  expect(serializeWbr(await applyWordBreaks('<p>a a1b2c3d4e5f6g7h8i</p>'))).toBe('a a1b2c3d4e|5f6g7h8i')
})

test('does not strand punctuation or single letters on a line', async () => {
  // Hard chunking must not orphan a trailing character: 'confidentiality|,',
  // 'interoperabilit|y', 'acknowledgement|s|.'.
  expect(serializeWbr(await applyWordBreaks('<p>data confidentiality, integrity</p>'))).toBe(
    'data confidentiality, integrity'
  )
  expect(serializeWbr(await applyWordBreaks('<p>the interoperability of it</p>'))).toBe('the interoperability of it')
  expect(serializeWbr(await applyWordBreaks('<p>see acknowledgements.</p>'))).toBe('see acknowledgements.')
})

test('breaks dotted machine-readable names at their periods, whatever their length', async () => {
  // 16 characters as an element's only content, so no length gate reaches it.
  expect(serializeWbr(await applyWordBreaks('<code>mail.isp.example</code>'))).toBe('mail|.isp|.example')
  expect(serializeWbr(await applyWordBreaks('<p>at isp.example</p>'))).toBe('at isp|.example')
  // `@` is one of the break-*before* separators, so the break lands ahead of it.
  expect(serializeWbr(await applyWordBreaks('<p>mail user@isp.example</p>'))).toBe('mail user|@isp|.example')
})

test('leaves dotted numbers alone, having no letters in their segments', async () => {
  expect(serializeWbr(await applyWordBreaks('<p>see Section 19.15 and 4.2.2</p>'))).toBe('see Section 19.15 and 4.2.2')
  expect(serializeWbr(await applyWordBreaks('<p>about 1.5 times</p>'))).toBe('about 1.5 times')
})

test('breaks path-like machine strings whose segments are numeric', async () => {
  // `10` and `17487` have no letters, so the dotted-name rule does not apply; `10` alone would
  // strand two characters, so the leading fragment is folded forward.
  expect(serializeWbr(await applyWordBreaks('<p>DOI 10.17487/RFC9000</p>'))).toBe('DOI 10.17487|/RFC9000')
})

test('leaves prose containing a slash alone', async () => {
  expect(serializeWbr(await applyWordBreaks('<p>and/or a request/response N/A</p>'))).toBe(
    'and/or a request/response N/A'
  )
})

test('protects prose from mid-word subdivision without protecting machine strings', async () => {
  // Prose, including a hyphenated compound and trailing punctuation: left whole.
  expect(serializeWbr(await applyWordBreaks('<p>data confidentiality, integrity</p>'))).toBe(
    'data confidentiality, integrity'
  )
  expect(serializeWbr(await applyWordBreaks('<p>see acknowledgements.</p>'))).toBe('see acknowledgements.')

  // Machine strings a word-shaped guard must not protect: a DOI, an Internet-Draft name and a
  // multi-hyphen identifier all subdivide.
  expect(serializeWbr(await applyWordBreaks('<p>at 10.7551/mitpress/7617.003.0006</p>'))).toBe(
    'at 10.7551|/mitpress|/7617|.003|.0006'
  )
  expect(serializeWbr(await applyWordBreaks('<p>see draft-ietf-quic-manageability-11</p>'))).toBe(
    'see draft-|ietf-|quic-|manageability-11'
  )

  // Longer than any word a reader expects whole, so it must be allowed to wrap.
  // 26 letters exceeds LONGEST_PLAUSIBLE_WORD, so it subdivides at the run length (10) rather than
  // in half: 9/9/8.
  expect(serializeWbr(await applyWordBreaks('<p>a abcdefghijklmnopqrstuvwxyz</p>'))).toBe(
    'a abcdefghi|jklmnopqr|stuvwxyz'
  )
})

test('breaks an underscore identifier at its underscore, never inside a word', () => {
  // A ten-character first segment plus its underscore exceeds the run length, so without care it
  // subdivides mid-word into `connec|tion_id`.
  expect(chunkString('connection_id', 10, 3)).toEqual(['connection_', 'id'])
  expect(chunkString('connection_ids', 10, 3)).toEqual(['connection_', 'ids'])
  expect(chunkString('connection_id_length', 10, 3)).toEqual(['connection_', 'id_', 'length'])

  // Segments within the run length break only at their underscores.
  expect(chunkString('qualifier_set', 10, 3)).toEqual(['qualifier_', 'set'])
  expect(chunkString('stream_data_blocked', 10, 3)).toEqual(['stream_', 'data_', 'blocked'])

  // The exemption is for underscores only, so punctuation and word fragments are still never
  // stranded: a trailing period, and a leading `10` that would sit alone.
  expect(chunkString('acknowledgements.', 10, 3)).toEqual(['acknowledgements.'])
  expect(chunkString('10.17487/RFC9000', 10, 3)).toEqual(['10.17487', '/RFC9000'])

  // And the segment has to be a name: RFC 9000's frame-types table has cells of a bare `___1`,
  // where the underscores mark a footnote rather than separate an identifier.
  expect(chunkString('___1', 10, 3)).toEqual(['___1'])
})

test('labels each break with the width its word needs', async () => {
  // The class names the bucket the whole word fits inside, so CSS can switch the breaks off once
  // the containing block is at least that wide.
  const classesFor = async (html: string) => {
    const pojo = await applyWordBreaks(html)
    const classes: string[] = []
    const walk = (nodes: ReturnType<typeof rfcDocumentToPojo>) =>
      nodes.forEach((node) => {
        if (node.type !== 'Element') return
        if (node.nodeName === 'wbr') classes.push(node.attributes.class ?? '')
        walk(node.children)
      })
    walk(pojo)
    return [...new Set(classes)]
  }

  expect(await classesFor('<p>connection_id</p>')).toEqual(['wordsize-8'])
  expect(await classesFor('<p>a1b2c3d4e5f6g7h8i</p>')).toEqual(['wordsize-10'])

  // Monospace and bold render wider than the body font, so the estimate uses the right table.
  expect(await classesFor('<code>mail.isp.example</code>')).toEqual(['wordsize-12'])
})
