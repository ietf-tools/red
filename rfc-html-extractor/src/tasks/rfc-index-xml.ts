import { readFile } from 'node:fs/promises'
import { XmlDocument, XsdValidator } from 'libxml2-wasm'
import { DateTime } from 'luxon'
import {
  formatAuthor,
  formatFormat
} from '../utilities/rfc-converters-utils.ts'
import type { RfcCommon } from '../../../client/app/utilities/rfc-validators.ts'
import {
  RFC_INDEX_XML_PATH,
  RFC_INDEX_XSD_PATH,
  saveToS3
} from '../utilities/s3.ts'
import { getDOMParser } from '../utilities/dom.ts'

export const uploadRfcIndexXml = async (
  allRfcs: Readonly<RfcCommon[]>
): Promise<boolean> => {
  const { xml, xsd } = await renderRfcIndexXml(allRfcs)
  await saveToS3(RFC_INDEX_XML_PATH, xml)
  console.log('Generated rfc-index.xml')
  await saveToS3(RFC_INDEX_XSD_PATH, xsd)
  console.log('Uploaded rfc-index.xsd')
  return true
}

const SCHEMA_URL = 'https://www.rfc-editor.org/rfc-index.xsd'
const NAMESPACE = 'https://www.rfc-editor.org/rfc-index'

export const renderRfcIndexXml = async (
  allRfcs: Readonly<RfcCommon[]>
): Promise<{ xml: string; xsd: string }> => {
  const xsd = await readFile('../assets/rfc-index.xsd', 'utf-8')

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
  xml += `<rfc-index xmlns="${NAMESPACE}" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="${NAMESPACE} ${SCHEMA_URL}">`
  xml += await renderBCPs(allRfcs)
  xml += await renderFYIs(allRfcs)
  xml += await renderRFCs(allRfcs)
  xml += await renderSTDs(allRfcs)
  xml += '</rfc-index>'

  // Validate XML with XSD
  const xsdDocument = XsdValidator.fromDoc(XmlDocument.fromString(xsd))
  const xmlDocument = XmlDocument.fromString(xml)
  try {
    xsdDocument.validate(xmlDocument)
  } catch (e) {
    console.error('rfc-index.xml validiation failure during regeneration', e)
    throw e
  }

  return { xml, xsd }
}

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

  const responseXml: string[] = []

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
    // Based on https://github.com/rfc-editor/rpcwebsite/blob/edf4896c1d97fdd79a78ee6145e3a0c5ffb11fb9/rfc-ed/bin/xmlIndex.pl

    const [month, year] = DateTime.fromISO(rfc.published)
      .toFormat('LLLL yyyy')
      .split(' ')

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

    rfcEntry.appendChild(
      createElementNS('current-status', rfc.status.slug.toUpperCase())
    )

    // FIXME: is this the correct RFC Commmon property to use?
    rfcEntry.appendChild(
      createElementNS('publication-status', rfc.status.slug.toUpperCase())
    )

    if (rfc.stream.slug === 'LEGACY') {
      rfcEntry.appendChild(createElementNS('stream', 'Legacy'))
    } else {
      rfcEntry.appendChild(createElementNS('stream', rfc.stream.name))
      if (rfc.area?.acronym) {
        rfcEntry.appendChild(createElementNS('area', rfc.area.acronym))
        rfcEntry.appendChild(
          createElementNS(
            'wg_acronyn',
            rfc.group.acronym === 'IETF-NWG'
              ? 'NON WORKING GROUP'
              : rfc.group.acronym
          )
        )
      }
    }

    if (rfc.errata && rfc.errata.length > 0) {
      rfc.errata.forEach((errataItem) => {
        rfcEntry.appendChild(createElementNS('errata-url', errataItem))
      })
    }

    if (rfc.identifiers && rfc.identifiers.length > 0) {
      rfc.identifiers.forEach((identifier) => {
        if (identifier.type === 'doi') {
          rfcEntry.appendChild(createElementNS('doi', identifier.value))
        } else if (identifier.type === 'issn') {
          rfcEntry.appendChild(createElementNS('issn', identifier.value))
        } else {
          throw Error(
            `Unhandled identifier ${identifier.type} ${JSON.stringify(
              identifier
            )}`
          )
        }
      })
    }

    responseXml.push(rfcEntry.outerHTML)
  })

  return responseXml.join('')
}

const renderBCPs = async (allRfcs: Readonly<RfcCommon[]>): Promise<string> => {
  // FIXME
  return ''
}

const renderFYIs = async (allRfcs: Readonly<RfcCommon[]>): Promise<string> => {
  // FIXME
  return ''
}

const renderSTDs = async (allRfcs: Readonly<RfcCommon[]>): Promise<string> => {
  // FIXME
  return ''
}
