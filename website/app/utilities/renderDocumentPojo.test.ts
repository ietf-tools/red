// The plain HTML form of a document pojo, used where there are no components to draw it.
// https://github.com/ietf-tools/red/issues/369
import { describe, expect, test } from 'vitest'
import type { NodePojo } from '~/utilities/rfc-validators'
import { renderNodePojoToHtmlString } from './renderDocumentPojo'

describe('renderNodePojoToHtmlString', () => {
  test('the new-window icon node draws nothing, rather than an unknown element', () => {
    const node: NodePojo = {
      type: 'Element',
      nodeName: 'OutsideLinkIcon',
      attributes: { href: 'https://doi.org/10.17487/RFC9000' },
      children: []
    }
    expect(renderNodePojoToHtmlString(node)).toBe('')
  })

  test('a link with the icon node inside keeps its text and its rel, and has no stray element', () => {
    const href = 'https://datatracker.ietf.org/wg/quic/about/'
    const node: NodePojo = {
      type: 'Element',
      nodeName: 'Anchor',
      attributes: { href },
      children: [
        { type: 'Text', textContent: 'QUIC' },
        { type: 'Element', nodeName: 'OutsideLinkIcon', attributes: { href }, children: [] }
      ]
    }
    expect(renderNodePojoToHtmlString(node)).toBe(`<a href="${href}" rel="noopener">QUIC</a>`)
  })
})
