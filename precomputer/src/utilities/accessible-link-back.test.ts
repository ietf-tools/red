// @vitest-environment node
import { describe, test, expect } from 'vitest'
import { addHeadingLinkBacks } from './accessible-link-back'
import { RfcBucketHtmlDocumentSchema } from '../../../website/app/utilities/rfc-validators'
import type { NodePojo, RfcBucketHtmlDocument } from '../../../website/app/utilities/rfc-validators'
import { testMockAllRfcs } from './rfcs-test-data'

const text = (textContent: string): NodePojo => ({ type: 'Text', textContent })

const el = (nodeName: string, attributes: Record<string, string>, children: NodePojo[] = []): NodePojo => ({
  type: 'Element',
  nodeName,
  attributes,
  children
})

const selfRefHeading = (nodeName: string, id: string, className = 'selfRef') =>
  el(nodeName, { id }, [el('a', { href: `#${id}`, class: className }, [text('Title')])])

const linkBack = (id: string) => el('a', { href: `#toc-${id}`, class: 'sr-only' }, [text('Back to TOC')])

const makeDoc = (documentHtmlObj: NodePojo[], withToc = true): RfcBucketHtmlDocument => ({
  rfc: testMockAllRfcs[testMockAllRfcs.length - 1]!,
  tableOfContents: withToc
    ? {
        title: 'Table of Contents',
        sections: [
          { links: [{ id: 'abstract', title: 'Abstract' }] },
          {
            links: [{ id: 'section-4', title: 'Four' }],
            sections: [{ links: [{ id: 'section-4.1', title: 'Four point one' }] }]
          }
        ]
      }
    : undefined,
  documentHtmlType: 'xml2rfc',
  documentHtmlObj,
  maxPreformattedLineLength: { max: 80 },
  timestampIso: '2025-01-01T00:00:00.000Z'
})

describe('addHeadingLinkBacks', () => {
  test('adds a visually hidden link back to the TOC after a selfRef heading link', () => {
    const result = addHeadingLinkBacks(makeDoc([selfRefHeading('h2', 'abstract')]))
    expect(result.documentHtmlObj).toEqual([
      el('h2', { id: 'abstract' }, [
        el('a', { href: '#abstract', class: 'selfRef' }, [text('Title')]),
        linkBack('abstract')
      ])
    ])
  })

  test('links back to nested TOC entries', () => {
    const result = addHeadingLinkBacks(makeDoc([selfRefHeading('h3', 'section-4.1')]))
    expect(result.documentHtmlObj).toEqual([
      el('h3', { id: 'section-4.1' }, [
        el('a', { href: '#section-4.1', class: 'selfRef' }, [text('Title')]),
        linkBack('section-4.1')
      ])
    ])
  })

  test('detects selfRef among multiple class tokens', () => {
    const result = addHeadingLinkBacks(makeDoc([selfRefHeading('h2', 'abstract', 'section-name selfRef')]))
    expect(result.documentHtmlObj).toEqual([
      el('h2', { id: 'abstract' }, [
        el('a', { href: '#abstract', class: 'section-name selfRef' }, [text('Title')]),
        linkBack('abstract')
      ])
    ])
  })

  test('adds only one link back per heading', () => {
    const heading = el('h2', { id: 'section-4' }, [
      el('a', { href: '#section-4', class: 'section-number selfRef' }, [text('4.')]),
      text(' '),
      el('a', { href: '#section-4', class: 'section-name selfRef' }, [text('Four')])
    ])
    const [result] = addHeadingLinkBacks(makeDoc([heading])).documentHtmlObj
    expect(
      result?.type === 'Element' &&
        result.children.filter((c) => c.type === 'Element' && c.attributes.class === 'sr-only')
    ).toHaveLength(1)
  })

  test('skips selfRef links whose target is not in the TOC', () => {
    const doc = makeDoc([selfRefHeading('h2', 'not-in-toc')])
    expect(addHeadingLinkBacks(doc).documentHtmlObj).toEqual(doc.documentHtmlObj)
  })

  test('skips selfRef links outside of headings', () => {
    const doc = makeDoc([el('p', {}, [el('a', { href: '#abstract', class: 'selfRef' }, [text('Abstract')])])])
    expect(addHeadingLinkBacks(doc).documentHtmlObj).toEqual(doc.documentHtmlObj)
  })

  test('skips headings without a selfRef link', () => {
    const doc = makeDoc([el('h2', { id: 'abstract' }, [text('Abstract')])])
    expect(addHeadingLinkBacks(doc).documentHtmlObj).toEqual(doc.documentHtmlObj)
  })

  test('finds headings nested within other elements', () => {
    const result = addHeadingLinkBacks(
      makeDoc([el('section', {}, [el('div', {}, [selfRefHeading('h2', 'abstract')])])])
    )
    expect(JSON.stringify(result.documentHtmlObj)).toContain('#toc-abstract')
  })

  test('returns the document unchanged when there is no table of contents', () => {
    const doc = makeDoc([selfRefHeading('h2', 'abstract')], false)
    expect(addHeadingLinkBacks(doc)).toBe(doc)
  })

  test('does not mutate the input', () => {
    const doc = makeDoc([selfRefHeading('h2', 'abstract')])
    const before = structuredClone(doc)
    addHeadingLinkBacks(doc)
    expect(doc).toEqual(before)
  })

  test('produces a document that passes the schema', () => {
    const result = addHeadingLinkBacks(makeDoc([selfRefHeading('h2', 'abstract')]))
    expect(RfcBucketHtmlDocumentSchema.safeParse(result).success).toBe(true)
  })
})
