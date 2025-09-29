import { DateTime } from 'luxon'
import {
  formatAuthor,
  formatFormat
} from '../utilities/rfc-converters-utils.ts'
import type { RfcCommon } from '../../../client/app/utilities/rfc-validators.ts'
import { RFC_INDEX_TXT_PATH, saveToS3 } from '../utilities/s3.ts'
import { getDOMParser } from '../utilities/dom.ts'

export const uploadRfcIndexXml = async (
  allRfcs: Readonly<RfcCommon[]>,
  rfcNumberColumnMinimumCharWidth: number
): Promise<boolean> => {
  const txt = await renderRfcIndexXml(allRfcs)
  await saveToS3(RFC_INDEX_TXT_PATH, txt)
  console.log('Generated rfc-index.txt')
  return true
}

export const renderRfcIndexXml = async (
  allRfcs: Readonly<RfcCommon[]>
): Promise<string> => {
  let responseXml = '<?xml version="1.0" encoding="UTF-8"?>\n'
  responseXml +=
    '<rfc-index xmlns="https://www.rfc-editor.org/rfc-index" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="https://www.rfc-editor.org/rfc-index https://www.rfc-editor.org/rfc-index.xsd">\n'
  // await renderBCPs(props)
  // await renderFYIs(props)
  responseXml += await renderRFCs(allRfcs)
  // await renderSTDs(props)

  responseXml += '</rfc-index>'
  return responseXml
}

// const renderBCPs = async (props: Props): Promise<void> => {
//   console.log(props.delayBetweenRequestsMs) // FIXME: remove this
//   // FIXME: render BCPs
// }

// const renderFYIs = async (props: Props): Promise<void> => {
//   console.log(props.delayBetweenRequestsMs) // FIXME: remove this
//   // FIXME: render FYIs
// }

const NAMESPACE = 'https://www.rfc-editor.org/rfc-index'

const renderRFCs = async (allRfcs: Readonly<RfcCommon[]>): Promise<string> => {
  const parser = await getDOMParser()

  const result = parser.parseFromString('<div></div>', 'application/xml')

  const createElementNS = (nodeName: string, text?: string): Element => {
    const element = result.createElementNS(NAMESPACE, nodeName)
    if (text) {
      const textNode = result.createTextNode(text)
      element.append(textNode)
    }
    return element
  }

  const responseXml: string[] =  []

  const createElementListNS = (
    listNodeName: string,
    listItemNodeName: string,
    texts: string[]
  ): Element => {
    const element = result.createElementNS(NAMESPACE, listNodeName)
    texts.forEach((text) => {
      const childElement = createElementNS(listItemNodeName)
      const textNode = result.createTextNode(text)
      childElement.appendChild(textNode)
      element.appendChild(childElement)
    })
    return element
  }

  allRfcs.forEach((rfc) => {
    const [month, year] = DateTime.fromISO(rfc.published)
      .toFormat('LLLL yyyy')
      .split(' ')

    // Based on https://github.com/rfc-editor/rpcwebsite/blob/edf4896c1d97fdd79a78ee6145e3a0c5ffb11fb9/rfc-ed/bin/xmlIndex.pl

    const rfcEntry = createElementNS('rfc-entry')

    rfcEntry.appendChild(createElementNS('doc-id', `RFC${rfc.number}`))
    rfcEntry.appendChild(createElementNS('title', rfc.title))

    rfc.authors.forEach((author) => {
      const authorElement = createElementNS('author')
      authorElement.appendChild(
        createElementNS('name', formatAuthor(author, 'regular'))
      )
      rfcEntry.appendChild(authorElement)
    })

    const dateElement = createElementNS('date')
    dateElement.appendChild(createElementNS('month', month))
    dateElement.appendChild(createElementNS('year', year))
    rfcEntry.appendChild(dateElement)

    rfcEntry.appendChild(
      createElementListNS(
        'format',
        'file-format',
        rfc.formats.map((format) =>
          formatFormat(
            format,
            // FIXME: get info on whether it's a pre-V3 rfc.... or ensure API will return ASCII
            true
          )
        )
      )
    )

    if (rfc.pages) {
      rfcEntry.appendChild(createElementNS('page-count', rfc.pages.toString()))
    }

    if (rfc.keywords) {
      rfcEntry.appendChild(createElementListNS('keywords', 'kw', rfc.keywords))
    }

    if (rfc.obsoletes) {
      rfcEntry.appendChild(
        createElementListNS(
          'obsoletes',
          'doc-id',
          rfc.obsoletes.map((obsolete) => `RFC${obsolete.number}`)
        )
      )
    }

    if (rfc.obsoleted_by) {
      rfcEntry.appendChild(
        createElementListNS(
          'obsoleted-by',
          'doc-id',
          rfc.obsoleted_by.map((item) => `RFC${item.number}`)
        )
      )
    }

    if (rfc.updated_by) {
      rfcEntry.appendChild(
        createElementListNS(
          'updated_by',
          'doc-id',
          rfc.updated_by.map((item) => `RFC${item.number}`)
        )
      )
    }

    if (rfc.abstract) {
      rfcEntry.appendChild(
        createElementListNS('abstract', 'p', rfc.abstract.split('\n'))
      )
    }

    if (rfc.draft) {
      rfcEntry.appendChild(createElementNS('draft', rfc.draft.slug))
    }

    
    rfcEntry.appendChild(createElementNS('current-status', rfc.status.slug.toUpperCase()))

    // FIXME: is this the correct RFC Commmon property to use?
    rfcEntry.appendChild(createElementNS('publication-status', rfc.status.slug.toUpperCase()))
    
    
    //       ...(rfc.stream.slug === 'LEGACY' ?
    //         { stream: 'Legacy' }
    //       : {
    //           stream: rfc.stream.name,
    //           ...(rfc.area?.acronym ? { area: rfc.area?.acronym } : {}),
    //           ...(rfc.group.acronym ?
    //             // wg_acronym:
    //             //   rfc.group.acronym === 'IETF-NWG' ?
    //             //     'NON WORKING GROUP'
    //             //   : rfc.group.acronym
    //             {}
    //           : {})
    //         }),
    //       ...(rfc.errata && rfc.errata.length > 0 ?
    //         {
    //           'errata-url': rfc.errata
    //         }
    //       : {}),
    //       doi:
    //         rfc.identifiers?.find((identifier) => identifier.type === 'doi')
    //           ?.value ?? undefined
    //     }
    //   }

    responseXml.push(rfcEntry.outerHTML)
  })
  
  return responseXml.join("")
}
