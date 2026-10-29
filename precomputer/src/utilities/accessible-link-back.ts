import type { NodePojo, RfcBucketHtmlDocument, TocSectionType } from '../../../website/app/utilities/rfc-validators.ts'

const HEADING_NODE_NAMES = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'])

/**
 * Heading Link Back: gives keyboard and screen reader users a way to jump from a heading
 * back to its entry in the table of contents. The website renders each TOC link with the
 * id `toc-${id}`, so a heading's `selfRef` link to `#${id}` gets a visually hidden sibling
 * link to `#toc-${id}`.
 */
export const addHeadingLinkBacks = (doc: RfcBucketHtmlDocument): RfcBucketHtmlDocument => {
  const { tableOfContents, documentHtmlObj } = doc
  if (!tableOfContents) {
    return doc
  }

  const tocIds = new Set<string>()
  const collectTocIds = (sections: TocSectionType[]) => {
    for (const { links, sections: childSections } of sections) {
      links?.forEach(({ id }) => tocIds.add(id))
      if (childSections) {
        collectTocIds(childSections)
      }
    }
  }
  collectTocIds(tableOfContents.sections)

  const findSelfRefTocId = (nodes: NodePojo[]): string | undefined => {
    for (const node of nodes) {
      if (node.type !== 'Element') {
        continue
      }
      const { nodeName, attributes, children } = node
      const { href, class: className } = attributes
      if (nodeName === 'a' && href?.startsWith('#') && className?.split(/\s+/).includes('selfRef')) {
        const id = href.slice(1)
        if (tocIds.has(id)) {
          return id
        }
      }
      const childId = findSelfRefTocId(children)
      if (childId !== undefined) {
        return childId
      }
    }
    return undefined
  }

  const walk = (node: NodePojo): NodePojo => {
    if (node.type !== 'Element') {
      return node
    }
    const { nodeName, children } = node
    if (!HEADING_NODE_NAMES.has(nodeName)) {
      return { ...node, children: children.map(walk) }
    }
    const id = findSelfRefTocId(children)
    if (id === undefined) {
      return node
    }
    return {
      ...node,
      children: [
        ...children,
        {
          type: 'Element',
          nodeName: 'a',
          attributes: { href: `#toc-${id}`, class: 'sr-only' },
          children: [{ type: 'Text', textContent: 'Back to TOC' }]
        }
      ]
    }
  }

  return { ...doc, documentHtmlObj: documentHtmlObj.map(walk) }
}
