import { getInnerText, getDOMParser } from '../utilities/dom.ts'
import type { RfcAndToc } from './rfc-html.ts'
import type { MaxPreformattedLineLengthSchemaType, TableOfContents } from '../../../client/app/utilities/rfc-validators.ts'

type TocSections = TableOfContents['sections']
type TocSection = TocSections[number]
type TocLink = NonNullable<TocSection['links']>[number]

export const parsePlaintextBody = (
  body: Document['body'],
  rfcAndToc: RfcAndToc
): void => {
  parsePlaintextToc(body, rfcAndToc)
}

const parsePlaintextToc = (
  body: Document['body'],
  rfcAndToc: RfcAndToc
): void => {
  //
  // Derived from
  // https://datatracker.ietf.org/doc/html/rfc2000
  // https://github.com/ietf-tools/datatracker/blob/2bf633bf70c40b9cb6baf428901615a0403e1ea5/ietf/static/js/document_html.js#L44

  function get_level(el: HTMLElement): number {
    let h: string | undefined
    if (el.tagName.match(/^h\d/i)) {
      h = el.tagName
    } else {
      el.classList.forEach((cl) => {
        if (cl.match(/^h\d/i)) {
          h = cl
          return
        }
      })
    }
    if (h === undefined) {
      throw Error('Unable to extract heading level')
    }
    return parseInt(h.charAt(h.length - 1), 10)
  }

  const tocSelector = 'h2, h3, h4, h5, h6, .h2, .h3, .h4, .h5, .h6'

  const headings = body.querySelectorAll<HTMLElement>(tocSelector)

  const min_level = Math.min(
    ...Array.from(headings).map((heading) => get_level(heading))
  )

  const tableOfContents: TableOfContents = {
    title: 'Table of contents',
    sections: []
  }

  rfcAndToc.tableOfContents = tableOfContents

  const tocSectionsStack: (TocSection | TableOfContents | undefined)[] = [
    tableOfContents
  ]
  let currentLevel = 0
  let n = 0

  headings.forEach((heading) => {
    const level = get_level(heading) - min_level
    const title = getInnerText(heading)
    if (!heading.id) {
      heading.id = `autoid-${++n}`
    }

    if (level < currentLevel) {
      while (level < currentLevel) {
        tocSectionsStack.pop()
        currentLevel--
      }
    } else {
      while (level > currentLevel) {
        const last = tocSectionsStack[tocSectionsStack.length - 1]
        const newSubsection: TocSection = {
          links: []
        }
        if (!last) {
          throw Error(
            'There should always be at least 1 item in tocsSectionsStack'
          )
        }
        if (!last.sections) {
          last.sections = []
        }
        const lastLastSection = last.sections[last.sections.length - 1]
        if (lastLastSection) {
          if (!lastLastSection.sections) {
            lastLastSection.sections = []
          }

          tocSectionsStack.push(lastLastSection)
        } else {
          tocSectionsStack.push(newSubsection)
        }

        currentLevel++
      }
    }

    const last = tocSectionsStack[tocSectionsStack.length - 1]
    if (!last) {
      throw Error('Should be at least 1 tocSectionsStack item')
    }

    const link: TocLink = {
      id: heading.id,
      title
    }

    const newSection: TocSection = {
      links: [link]
    }

    if (last && 'links' in last && last.links?.length === 0) {
      last.links.push(link)
    } else {
      if (!last.sections) {
        last.sections = []
      }
      last.sections.push(newSection)
    }
  })
}

export const getPlaintextRfcDocument = (dom: Document): Node[] => {
  return Array.from(dom.body.childNodes)
}

export const getPlaintextMaxLineLength = async (
  dom: Document
): Promise<MaxPreformattedLineLengthSchemaType> => {
  const DEFAULT_MAX_LINE_LENGTH = 50

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

  /**
   * Counts max line length, but also counts the number of <a> links
   * in the line so that we can account for Red's use of buttons following
   * links when in responsive/touch mode. We allocate ANCHOR_SUFFIX_CHAR_WIDTH
   * chars per link in a line.
   * 
   * This means that the max line length can vary between touch and touchless
   * interfaces.
   */
  const ANCHOR_SUFFIX_CHAR_WIDTH = 3
  const domParser = await getDOMParser()
  const maxWithAnchorSuffix = pres.reduce(
    (prevMaxLineLength, pre) =>
      Math.max(
        prevMaxLineLength,
        ...pre.innerHTML.split('\n').map((lineHTML) => {
          const lineDom = domParser.parseFromString(
            `<div>${lineHTML}</div>`,
            'text/html'
          )
          const innerText = getInnerText(lineDom.documentElement)
          const anchors = lineDom.querySelectorAll('a')
          return innerText.length + (anchors.length * ANCHOR_SUFFIX_CHAR_WIDTH)
        })
      ),
    DEFAULT_MAX_LINE_LENGTH
  )

  return {
    max,
    maxWithAnchorSuffix
  }
}
