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

  const tocTitles = new Map<string, string>()
  const collectTocTitles = (sections: TocSectionType[]) => {
    for (const { links, sections: childSections } of sections) {
      links?.forEach(({ id, title }) => tocTitles.set(id, title))
      if (childSections) {
        collectTocTitles(childSections)
      }
    }
  }
  collectTocTitles(tableOfContents.sections)

  const findSelfRefTocId = (nodes: NodePojo[]): string | undefined => {
    for (const node of nodes) {
      if (node.type !== 'Element') {
        continue
      }
      const { nodeName, attributes, children } = node
      const { href, class: className } = attributes
      if (nodeName === 'a' && href?.startsWith('#') && className?.split(/\s+/).includes('selfRef')) {
        const id = href.slice(1)
        if (tocTitles.has(id)) {
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
    const title = id === undefined ? undefined : tocTitles.get(id)
    if (id === undefined || title === undefined) {
      return node
    }
    return {
      ...node,
      children: [
        ...children,
        {
          type: 'Element',
          nodeName: 'a',
          attributes: { href: `#toc-${id}`, 'aria-label': `Skip to TOC: ${title}`, class: 'toc-link-back' },
          children: [{ type: 'Text', textContent: 'Skip to TOC' }]
        }
      ]
    }
  }

  return { ...doc, documentHtmlObj: documentHtmlObj.map(walk) }
}
