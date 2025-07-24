import { getInnerText, isHtmlElement } from '../dom'
import { blankRfcCommon } from '../rfc'
import type { RfcEditorToc } from '../tableOfContents'
import type { RfcAndToc } from './index'

type TocSections = RfcEditorToc['sections']
type TocSection = TocSections[number]
type TocLink = NonNullable<TocSection['links']>[number]

export const parsePlaintextHead = (
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

export const parsePlaintextBody = (
  body: Document['body'],
  rfcAndToc: RfcAndToc
): void => {
  parsePlaintextToc(body, rfcAndToc)
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
        rfcAndToc.rfc.title = node.innerText
      }

      const idsToRemove = ['toc', 'external-metadata', 'internal-metadata']
      if (idsToRemove.includes(node.id)) {
        return false
      }
    }
    return true
  })
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

  const tableOfContents: RfcEditorToc = {
    title: 'Table of contents',
    sections: []
  }

  rfcAndToc.tableOfContents = tableOfContents

  const tocSectionsStack: (TocSection | RfcEditorToc | undefined)[] = [
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
  const tocSelector = 'h2, h3, h4, h5, h6, .h2, .h3, .h4, .h5, .h6'

  const headings = Array.from(
    dom.body.querySelectorAll<HTMLElement>(tocSelector)
  )

  console.log(
    'ids:',
    headings.map((heading) => heading.id)
  )

  return Array.from(dom.body.childNodes).filter((node) => {
    if (isHtmlElement(node)) {
      switch (node.nodeName.toLowerCase()) {
        case 'script':
          return false
      }
    }
    return true
  })
}

export const getPlaintextMaxLineLength = (dom: Document): number => {
  const DEFAULT_MAX_LINE_LENGTH = 50

  const pres = Array.from(dom.body.querySelectorAll<HTMLElement>('pre'))
  return pres.reduce((prevMaxLineLength, pre) => {
    const maxLineLengthContenders = getInnerText(pre)
      .split('\n')
      .map((text) => ({
        text,
        length: text.length
      }))
    const biggerLines = maxLineLengthContenders.filter(
      (line) => line.length > prevMaxLineLength
    )
    if (biggerLines.length) {
      console.log('bigger', biggerLines)
    }
    return Math.max(
      prevMaxLineLength,
      ...maxLineLengthContenders.map((line) => line.length)
    )
  }, DEFAULT_MAX_LINE_LENGTH)
}
