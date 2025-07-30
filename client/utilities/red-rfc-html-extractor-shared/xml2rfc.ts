import { getInnerText, isHtmlElement } from '../dom'
import { blankRfcCommon } from '../rfc'
import type { RfcEditorToc } from '../tableOfContents'
import type { RfcAndToc } from './index'

type TocSections = RfcEditorToc['sections']
type TocSection = TocSections[number]
type TocLink = NonNullable<TocSection['links']>[number]

export const parseXml2RfcHead = (
  head: Document['head'],
  rfcAndToc: RfcAndToc
): void => {
  head.childNodes.forEach((node) => {
    if (isHtmlElement(node)) {
      let name: string | null,
        content: string | null,
        rel: string | null,
        href: string | null

      switch (node.nodeName.toLowerCase()) {
        case 'meta':
          name = node.getAttribute('name')
          content = node.getAttribute('content')
          if (content) {
            switch (name) {
              case 'author':
                if (!rfcAndToc.rfc.authors) {
                  rfcAndToc.rfc.authors = []
                }
                rfcAndToc.rfc.authors.push({
                  name: content
                })
                break
              case 'description':
                rfcAndToc.rfc.abstract = content
                break
              case 'rfc.number':
                if (rfcAndToc.rfc.number === blankRfcCommon.number) {
                  rfcAndToc.rfc.number = parseInt(content, 10)
                }
                break
              case 'keyword':
                if (rfcAndToc.rfc.keywords === undefined) {
                  rfcAndToc.rfc.keywords = []
                }
                rfcAndToc.rfc.keywords.push(content)
                break
            }
          }
          break
        case 'title':
          // don't try to parse the <title> because it has both the RFC title and RFC number in it,
          // so we'll use other parts of the HTML (the title in the <body>) which are easier to use
          break
        case 'link':
          rel = node.getAttribute('rel')
          href = node.getAttribute('href')
          if (href && rel) {
            if (rel === 'alternate') {
              if (rfcAndToc.rfc.identifiers === undefined) {
                rfcAndToc.rfc.identifiers = []
              }

              if (href.includes('doi.org')) {
                rfcAndToc.rfc.identifiers.push({
                  type: 'doi',
                  value: href
                })
              } else if (href.includes('urn:issn:')) {
                rfcAndToc.rfc.identifiers.push({
                  type: 'issn',
                  value: href
                })
              }
            }
          }
          break
      }
    }
  })
}

export const parseXml2RfcBody = (
  body: Document['body'],
  rfcAndToc: RfcAndToc
): void => {
  body.childNodes.forEach((node) => {
    if (isHtmlElement(node)) {
      if (
        node.id === 'rfcnum' &&
        rfcAndToc.rfc.number === blankRfcCommon.number
      ) {
        rfcAndToc.rfc.number = parseInt(
          node.innerText.replace(/[^0-9]/gi, ''),
          10
        )
      } else if (node.id === 'title') {
        rfcAndToc.rfc.title = getInnerText(node)
      } else if (node.id === 'toc') {
        rfcAndToc.tableOfContents = parseXml2RfcToc(node)
      }
      const idsToRemove = ['toc', 'external-metadata', 'internal-metadata']
      if (idsToRemove.includes(node.id)) {
        return false
      }
    }
    return true
  })
}

const parseXml2RfcToc = (toc: HTMLElement): RfcEditorToc => {
  const isTocSection = (
    maybeTocSection?: TocSection
  ): maybeTocSection is TocSection => {
    return Boolean(
      maybeTocSection &&
        typeof maybeTocSection === 'object' &&
        'links' in maybeTocSection
    )
  }

  const walk = (node: Node): TocSection | undefined => {
    if (isHtmlElement(node)) {
      if (node.nodeName.toLowerCase() === 'li') {
        const links = Array.from(node.childNodes)
          .flatMap((childNode) => {
            if (
              isHtmlElement(childNode) &&
              childNode.nodeName.toLowerCase() !== 'ul'
            ) {
              const internalLinks = childNode.querySelectorAll('a')
              return Array.from(internalLinks).map((internalLink) => {
                if (isHtmlElement(internalLink)) {
                  const href = internalLink.getAttribute('href')
                  if (
                    href?.startsWith('#')
                    // it's an internal link, assume a TOC link
                  ) {
                    const title = getInnerText(internalLink)
                    if (title.length > 0) {
                      return {
                        id: href.substring(1),
                        title
                      }
                    }
                  } else {
                    console.warn(
                      `Found non TOC link`,
                      href,
                      internalLink.outerHTML
                    )
                  }
                } else {
                  throw Error(`Didn't expect non-element. Was ${internalLink}`)
                }
              })
            }
          })
          .filter((link): link is TocLink => {
            return !!link
          })

        const subsections = Array.from(node.childNodes)
          .map((childNode) => {
            if (
              isHtmlElement(childNode) &&
              childNode.nodeName.toLowerCase() === 'ul'
            ) {
              return Array.from(childNode.childNodes)
                .map(walk)
                .filter(isTocSection)
            }
          })
          .filter(
            (
              subsections
            ): subsections is NonNullable<TocSection['sections']> => {
              return !!subsections
            }
          )

        const newSection: TocSection = {
          links
        }

        if (subsections.length > 0 && subsections[0].length > 0) {
          newSection.sections = subsections[0]
        }

        return newSection
      }
    }
  }

  const root = toc.querySelector('ul')

  if (!root) {
    throw Error("Couldn't find root node")
  }

  const sections: TocSections = Array.from(root.childNodes)
    .map(walk)
    .filter(isTocSection)

  return {
    title: 'Table of Contents',
    sections
  }
}

export const getXml2RfcRfcDocument = (dom: Document): Node[] => {
  const nodes = Array.from(dom.body.childNodes).filter((node) => {
    if (isHtmlElement(node)) {
      switch (node.nodeName.toLowerCase()) {
        case 'script':
          return false
        case 'table':
          if (node.classList.contains('ears')) {
            return false
          }
          break
      }
      const idsToRemove = [
        'toc',
        'rfcnum',
        'title',
        'external-metadata',
        'internal-metadata'

        // 'section-abstract'
        // 'status-of-memo',
        // 'copyright'
      ]
      if (idsToRemove.includes(node.id)) {
        return false
      }
    }
    return true
  })

  return nodes.map(fixNodeForMobile)
}

/**
 * The HTML needs minor changes to ensure mobile rendering on Red.
 *
 * Tailwind's grepper won't be able to see these CSS classes so we rely on
 * the same classes already existing in the generated CSS bundle (because they
 * were already used elsewhere, in Red).
 *
 * If using unpopular classes this would need a different approach.
 */
const fixNodeForMobile = (node: Node): Node => {
  if (isHtmlElement(node)) {
    const tagName = node.tagName.toLowerCase()
    const wrapper = node.ownerDocument.createElement('div')
    switch (tagName) {
      case 'pre':
      case 'table':
        // <pre>s can be too wide, so we wrap them to make a scrollable area
        wrapper.classList.add(
          // see above docstring about Tailwind classes
          'w-full',
          'max-w-screen',
          'overflow-x-auto'
        )
        wrapper.setAttribute('data-component', 'HorizontalScrollable')
        wrapper.appendChild(node)
        return wrapper
    }
    const newChildren = Array.from(node.childNodes).map(fixNodeForMobile)
    node.replaceChildren(...newChildren)
    return node
  }
  return node
}

/**
 * Unlike plaintext RFCs these HTML RFCs aren't entirely <pre>formatted text
 * but they can include preformatted sections (eg ASCII art) that should be
 * sized, so we still calculate the max line length of <pre>s within.
 */
export const getXml2RfcMaxLineLength = (dom: Document): number => {
  /**
   * The DEFAULT_MAX_LINE_LENGTH is less than the plaintext equivalent.
   *
   * This is because HTML RFC <pre> sections might be just ASCII art, and as such there's
   * without any
   * particular width conventions. Unlike plaintext RFCs we can't assume <pre> sections within
   * HTML are 80 chars by default. , so we'll
   * start off with a smaller number than 80.
   */
  const DEFAULT_MAX_LINE_LENGTH = 40

  const pres = Array.from(dom.body.querySelectorAll<HTMLElement>('pre'))
  return pres.reduce(
    (prevMaxLineLength, pre) =>
      Math.max(
        prevMaxLineLength,
        ...getInnerText(pre)
          .split('\n')
          .map((line) => line.length)
      ),
    DEFAULT_MAX_LINE_LENGTH
  )
}
