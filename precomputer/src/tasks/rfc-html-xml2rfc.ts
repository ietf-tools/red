import { convertCSSUnit, parseCSSLength } from '../css-unit-converter/index.ts'
import { getDOMParser, getInnerText, isHtmlElement } from '../utilities/dom.ts'
import type { MaxPreformattedLineLengthSchemaType, TableOfContents } from '../../../website/app/utilities/rfc-validators.ts'
import type { RfcAndToc } from './rfc-html.ts'

type TocSections = TableOfContents['sections']
type TocSection = TocSections[number]
type TocLink = NonNullable<TocSection['links']>[number]

export const parseXml2RfcBody = (
  body: Document['body'],
  rfcAndToc: RfcAndToc
): void => {
  body.childNodes.forEach((node) => {
    if (isHtmlElement(node)) {
      if (node.id === 'toc') {
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

const parseXml2RfcToc = (toc: HTMLElement): TableOfContents => {
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
              return Array.from(internalLinks)
                .filter((internalLink) => {
                  // RFC8881 has pilcrows in the TOC
                  // https://www.rfc-editor.org/rfc/rfc8881.html
                  return !internalLink.classList.contains('pilcrow')
                })
                .map((internalLink) => {
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
                    throw Error(
                      `Didn't expect non-element. Was ${internalLink}`
                    )
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

  return nodes.flatMap((node) => fixNodeForMobile(node))
}

const getHorizontalScrollable = (
  htmlElement: HTMLElement,
  absolute?: { widthCSSLength: string; heightCSSLength: string }
) => {
  const horizontalScrollable = htmlElement.ownerDocument.createElement('div')
  horizontalScrollable.setAttribute('data-component', 'HorizontalScrollable')
  if (absolute) {
    horizontalScrollable.setAttribute(
      'data-component-absolute',
      true.toString()
    )
    horizontalScrollable.setAttribute(
      'data-component-childwidth',
      absolute.widthCSSLength.toString()
    )
    horizontalScrollable.setAttribute(
      'data-component-childheight',
      absolute.heightCSSLength.toString()
    )
  }
  return horizontalScrollable
}

/**
 * The HTML needs minor changes to ensure mobile rendering when rendered on
 * the rfc-editor site.
 */
const fixNodeForMobile = (
  node: Node,
  isInsideHorizontalScrollable: boolean = false
): Node | Node[] => {
  if (isHtmlElement(node)) {
    const tagName = node.tagName.toLowerCase()

    if (isInsideHorizontalScrollable === false) {
      switch (tagName) {
        case 'ol':
        case 'ul':
        case 'pre':
        case 'table':
          const newChildren1 = Array.from(node.childNodes).flatMap((node) =>
            fixNodeForMobile(node, true)
          )
          // these can be too wide, so we wrap them in a scrollable area
          node.replaceChildren(...newChildren1)
          const horizontalScrollable1 = getHorizontalScrollable(node)
          horizontalScrollable1.appendChild(node)
          return horizontalScrollable1
        case 'svg':
          return wrapSvg(node)
      }
    }

    const newChildren = Array.from(node.childNodes).flatMap((node) =>
      fixNodeForMobile(node, isInsideHorizontalScrollable)
    )
    node.replaceChildren(...newChildren)
    return node
  }
  return node
}

const wrapSvg = (svg: HTMLElement): HTMLElement => {
  // these can be too wide, so we'll wrap them in a scrollable area
  // but because SVGs are often inline deeper in the document (ie not a
  // direct child of <body>) they come with some indentation to the left,
  // so we can't use the full viewport width for the SVG. This indentation
  // makes Red's rendering in a <HorizontalScrollable> indented too.
  //
  // <HorizontalScrollable> mostly affects mobile as most SVGs are small
  // enough to be visible on a 1920x1080 display, where that component
  // doesn't render any scroll hint box-shadows.
  //
  // So we'll assist Red by suggesting a `position:absolute;left:0px`
  // HorizontalScrollable that is full width. Because this pulls the
  // SVG out of regular browser layout flow we'll also provide the
  // dimensions for a placeholder, taken from the SVG's dimensions.
  //
  // This is so that Red can insert blank space where the SVG was in
  // the layout flow, so that following Nodes don't render underneath
  // the newly `position:absolute` SVG.
  if (!svg) {
    console.error({ node: svg })
    throw Error(`Expected SVG but got node (see console) ${svg}`)
  }

  const getSvgDimensions = (
    el: HTMLElement
  ): {
    widthCSSLength: string
    widthPx: number
    heightCSSLength: string
    heightPx: number
  } => {
    const DEFAULT_SVG_WIDTH_PX = 724 // taken from width of this SVG at 1920x1080 window size https://www.rfc-editor.org/rfc/rfc9692.html#name-rift-information-distributi

    const parseLength = (lengthAttr: string | null): number => {
      if (lengthAttr === null) return Number.NaN
      const parts = parseCSSLength(lengthAttr)
      if (parts === null) {
        throw Error(`Unable to parse ${JSON.stringify(lengthAttr)}`)
      }
      const [length, unit] = parts
      return convertCSSUnit(length, unit, 'px')
    }
    const ensureUnit = (lengthAttr: string): string => {
      const parts = parseCSSLength(lengthAttr)
      if (!parts) {
        throw Error(`Can't parse ${JSON.stringify(lengthAttr)} in ensureUnit`)
      }
      return `${parts[0]}${parts[1]}`
    }

    const DEFAULT_SVG_HEIGHT_PX = DEFAULT_SVG_WIDTH_PX

    const widthAttr = el.getAttribute('width')
    let widthPx = parseLength(widthAttr)
    const heightAttr = el.getAttribute('height')
    let heightPx = parseLength(heightAttr)

    if (Number.isNaN(widthPx) || Number.isNaN(heightPx)) {
      widthPx = DEFAULT_SVG_WIDTH_PX
      heightPx = DEFAULT_SVG_HEIGHT_PX

      // fallback to using viewBox to determine a height that fits that aspect ratio
      const viewBoxAttr = el.getAttribute('viewBox')
      if (viewBoxAttr) {
        const [x1Attr, y1Attr, x2Attr, y2Attr] = viewBoxAttr.split(/\s+/)
        const x1 = parseFloat(x1Attr)
        const y1 = parseFloat(y1Attr)
        const x2 = parseFloat(x2Attr)
        const y2 = parseFloat(y2Attr)
        if (
          Number.isNaN(x1) ||
          Number.isNaN(y1) ||
          Number.isNaN(x2) ||
          Number.isNaN(y2)
        ) {
          // fallback to default value
          console.error(
            'Could not find width/height/viewBox of SVG. This could break mobile layout',
            { widthAttr, heightAttr, viewBoxAttr }
          )
        } else {
          const viewBoxWidth = x2 - x1
          const viewBoxHeight = y2 - y1
          const viewBoxRatio = viewBoxHeight / viewBoxWidth
          heightPx = widthPx * viewBoxRatio
        }
      }
    }

    return {
      widthCSSLength: ensureUnit(widthAttr ?? widthPx.toString()),
      widthPx,
      heightCSSLength: ensureUnit(heightAttr ?? heightPx.toString()),
      heightPx
    }
  }

  // Wrap larger SVGs in a HorizontalScrollable so as to not break layout, but leave
  // smaller SVGs, such as icons, as-is and unwrapped.
  //
  // The choice of this number is mostly an arbitrary threshold, but based
  // on these numbers...
  //
  //  - small mobile viewport is about 250px
  //  - indentation from the left due to list items tables etc might be 100px
  //
  // So an SVG would only need to be 150px wide to exceed the viewport width and
  // stretch/break layout. 100px is chosen to allow even more buffer from breaking
  // layout.
  const NEEDS_HORIZONTALSCROLLABLE_THRESHOLD_PX = 100

  const { widthCSSLength, widthPx, heightCSSLength, heightPx } =
    getSvgDimensions(svg)

  svg.setAttribute('width', widthCSSLength)
  svg.setAttribute('height', heightCSSLength)

  if (widthPx > NEEDS_HORIZONTALSCROLLABLE_THRESHOLD_PX) {
    const newChildren2 = Array.from(svg.childNodes).flatMap((node) =>
      fixNodeForMobile(node, true)
    )
    svg.replaceChildren(...newChildren2)
    const hs2 = getHorizontalScrollable(svg, {
      widthCSSLength,
      heightCSSLength
    })

    if (svg.parentElement) {
      const LEFT = 'alignLeft'
      const CENTER = 'alignCenter'
      const RIGHT = 'alignRight'
      if (svg.parentElement.classList.contains(LEFT)) {
        svg.parentElement.classList.remove(LEFT)
        hs2.classList.add(LEFT)
      } else if (svg.parentElement.classList.contains(CENTER)) {
        svg.parentElement.classList.remove(CENTER)
        hs2.classList.add(CENTER)
      } else if (svg.parentElement.classList.contains(RIGHT)) {
        svg.parentElement.classList.remove(RIGHT)
        hs2.classList.add(RIGHT)
      }
      // console.log(' - horizontalscrollable ', hs2.className)
    }
    hs2.appendChild(svg)
    // console.log(' - big SVG', widthPx, heightPx)
    return hs2
  }

  // console.log(' - small SVG', widthPx, heightPx)
  const newChildren3 = Array.from(svg.childNodes).flatMap((node) =>
    fixNodeForMobile(node, false)
  )
  svg.replaceChildren(...newChildren3)
  return svg
}

/**
 * Unlike plaintext RFCs these HTML RFCs aren't entirely <pre>formatted text
 * but they can include preformatted sections (eg ASCII art) that should be
 * sized, so we still calculate the max line length of <pre>s within.
 */
export const getXml2RfcMaxLineLength = async (
  dom: Document
): Promise<MaxPreformattedLineLengthSchemaType> => {
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
  const max = pres.reduce(
    (prevMaxLineLength, pre) =>
      Math.max(
        prevMaxLineLength,
        ...getInnerText(pre)
          .split('\n')
          .map((line) => line.length)
      ),
    DEFAULT_MAX_LINE_LENGTH
  )

  return {
    max
  }
}
