// @vitest-environment node
import { describe, test, expect } from 'vitest'
import type { NodePojo } from '../../../website/app/utilities/rfc-validators.ts'
import { getDOMParser, rfcDocumentToPojo } from './dom.ts'
import { keepPunctuationWithLinks } from './keep-punctuation-with-links.ts'

const toHtml = (nodes: NodePojo[]): string =>
  nodes
    .map((node) => {
      if (node.type === 'Text') return node.textContent
      const attributes = Object.entries(node.attributes)
        .map(([name, value]) => ` ${name}="${value}"`)
        .join('')
      return `<${node.nodeName}${attributes}>${toHtml(node.children)}</${node.nodeName}>`
    })
    .join('')

const render = async (html: string): Promise<string> => {
  const parser = await getDOMParser()
  const dom = parser.parseFromString(html, 'text/html')
  return toHtml(keepPunctuationWithLinks(rfcDocumentToPojo(Array.from(dom.body.childNodes))))
}

describe('keepPunctuationWithLinks', () => {
  test.each([
    {
      name: 'wraps a link and the comma that follows it',
      input: '<p>see <a href="/x">IRTF</a>, some other</p>',
      expected: '<p>see <span class="keep-together"><a href="/x">IRTF</a>,</span> some other</p>'
    },
    {
      name: 'keeps a run of punctuation together',
      input: '<p>(<a href="/x">IRTF</a>).</p>',
      expected: '<p>(<span class="keep-together"><a href="/x">IRTF</a>).</span></p>'
    },
    {
      name: 'leaves the link alone when text after it starts with a space',
      input: '<p><a href="/x">IRTF</a> and more</p>',
      expected: '<p><a href="/x">IRTF</a> and more</p>'
    },
    {
      name: 'leaves the link alone when it is the last child',
      input: '<p>see <a href="/x">IRTF</a></p>',
      expected: '<p>see <a href="/x">IRTF</a></p>'
    },
    {
      name: 'leaves the link alone when an element follows it',
      input: '<p><a href="/x">IRTF</a><em>,</em></p>',
      expected: '<p><a href="/x">IRTF</a><em>,</em></p>'
    },
    {
      name: 'ignores punctuation after elements other than links',
      input: '<p><em>IRTF</em>, more</p>',
      expected: '<p><em>IRTF</em>, more</p>'
    },
    {
      name: 'drops no text when the punctuation is the whole following text node',
      input: '<p><a href="/x">IRTF</a>.<em>x</em></p>',
      expected: '<p><span class="keep-together"><a href="/x">IRTF</a>.</span><em>x</em></p>'
    },
    {
      name: 'handles links nested in lists and tables',
      input:
        '<ul><li><a href="/x">A</a>; <a href="/y">B</a>.</li></ul><table><tr><td><a href="/z">C</a>,</td></tr></table>',
      expected:
        '<ul><li><span class="keep-together"><a href="/x">A</a>;</span> <span class="keep-together"><a href="/y">B</a>.</span></li></ul><table><tbody><tr><td><span class="keep-together"><a href="/z">C</a>,</span></td></tr></tbody></table>'
    }
  ])('$name', async ({ input, expected }) => {
    expect(await render(input)).toBe(expected)
  })

  test('returns an equivalent tree when there is nothing to wrap', async () => {
    const html = '<h1>Title</h1><p>plain <a href="/x">link</a> text</p>'
    expect(await render(html)).toBe(html)
  })
})
