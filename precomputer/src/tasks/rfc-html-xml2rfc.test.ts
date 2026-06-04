// @vitest-environment node
import { describe, expect, test } from 'vitest'
import { getDOMParser, isHtmlElement } from '../utilities/dom.ts'
import { getXml2RfcRfcDocument } from './rfc-html-xml2rfc.ts'
import {
  RFC8792_COPY_CLASS,
  RFC8792_COPY_UNFOLDED_ATTR,
  RFC8792_SOURCECODE_MARKERS_ATTR
} from '../../../website/shared/utils/rfc8792.ts'

const getElementById = (nodes: Node[], id: string): HTMLElement => {
  const element = nodes.find(
    (node): node is HTMLElement =>
      isHtmlElement(node) && node.getAttribute('id') === id
  )

  if (!element) {
    throw Error(`Unable to find element ${id}`)
  }

  return element
}

describe('getXml2RfcRfcDocument RFC 8792 copy unfolded tagging', () => {
  test('marks folded sourcecode blocks and removes upstream buttons', async () => {
    const parser = await getDOMParser()
    const dom = parser.parseFromString(
      `<!doctype html>
      <html>
        <body>
          <div class="sourcecode" id="folded">
            <pre>========== NOTE: '\\' line wrapping per RFC 8792 ===========

first folded line \\
continues here
</pre>
            <button type="button" class="copy-unfolded">Copy unfolded</button>
            <a href="#folded" class="pilcrow">&para;</a>
          </div>
          <div class="sourcecode" id="not-folded">
            <pre>NOTE: '\\' line wrapping per RFC 8792
This block mentions the header but does not use RFC 8792 folding.
</pre>
          </div>
        </body>
      </html>`,
      'text/html'
    )

    const nodes = getXml2RfcRfcDocument(dom)
    const folded = getElementById(nodes, 'folded')
    const notFolded = getElementById(nodes, 'not-folded')

    expect(folded.classList.contains(RFC8792_COPY_CLASS)).toBe(true)
    expect(folded.getAttribute(RFC8792_COPY_UNFOLDED_ATTR)).toBe('true')
    expect(folded.querySelector('button.copy-unfolded')).toBeNull()
    expect(
      folded.querySelector('[data-component="HorizontalScrollable"] pre')
    ).toBeTruthy()

    expect(notFolded.classList.contains(RFC8792_COPY_CLASS)).toBe(false)
    expect(notFolded.hasAttribute(RFC8792_COPY_UNFOLDED_ATTR)).toBe(false)
  })

  test('marks renderer-added sourcecode markers for stripping', async () => {
    const parser = await getDOMParser()
    const dom = parser.parseFromString(
      `<!doctype html>
      <html>
        <body>
          <div class="sourcecode" id="marked">
            <pre>&lt;CODE BEGINS&gt; file "marked-wrap.txt"
NOTE: '\\' line wrapping per RFC 8792

marked folded line \\
continues here

&lt;CODE ENDS&gt;</pre>
          </div>
        </body>
      </html>`,
      'text/html'
    )

    const nodes = getXml2RfcRfcDocument(dom)
    const marked = getElementById(nodes, 'marked')

    expect(marked.classList.contains(RFC8792_COPY_CLASS)).toBe(true)
    expect(marked.getAttribute(RFC8792_SOURCECODE_MARKERS_ATTR)).toBe('true')
  })
})
