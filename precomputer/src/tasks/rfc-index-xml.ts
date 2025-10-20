import { resolve } from 'node:path'
import { readFile } from 'node:fs/promises'
import {
  XmlDocument,
  XsdValidator,
  XmlValidateError
} from 'libxml2-wasm'
import { DateTime } from 'luxon'
import {
  formatAuthor,
  formatFormat
} from '../utilities/rfc-converters-utils.ts'
import type { InfoSubseriesItem, RfcCommon } from '../../../website/app/utilities/rfc-validators.ts'
import {
  RFC_INDEX_XML_PATH,
  RFC_INDEX_XSD_PATH,
  saveToS3
} from '../utilities/s3.ts'
import { getDOMParser, deleteDefaultNamespaces } from '../utilities/dom.ts'

export const uploadRfcIndexXml = async (
  allRfcs: Readonly<RfcCommon[]>,
  allSubseries: Readonly<InfoSubseriesItem[]>
): Promise<boolean> => {
  const { xml, xsd } = await renderRfcIndexXml(allRfcs, allSubseries)
  await saveToS3(RFC_INDEX_XML_PATH, xml)
  console.log('Uploaded', RFC_INDEX_XML_PATH)
  await saveToS3(RFC_INDEX_XSD_PATH, xsd)
  console.log('Uploaded', RFC_INDEX_XSD_PATH)
  return true
}

const W3C_SCHEMA_URL = 'http://www.w3.org/2001/XMLSchema-instance'
const SCHEMA_URL = 'https://www.rfc-editor.org/rfc-index.xsd'
const RPC_NAMESPACE = 'https://www.rfc-editor.org/rfc-index'

export const renderRfcIndexXml = async (
  allRfcs: Readonly<RfcCommon[]>,
  allSubseries: Readonly<InfoSubseriesItem[]>
): Promise<{ xml: string; xsd: string }> => {
  const xsdPath = resolve(import.meta.dirname, '../assets/rfc-index.xsd')
  const xsd = await readFile(xsdPath, 'utf-8')

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
  xml += `<rfc-index xmlns="${RPC_NAMESPACE}" xmlns:xsi="${W3C_SCHEMA_URL}" xsi:schemaLocation="${RPC_NAMESPACE} ${SCHEMA_URL}">\n`
  xml += await renderSubseries(allRfcs, allSubseries, 'bcp', false)
  xml += await renderSubseries(allRfcs, allSubseries, 'fyi', false)
  xml += await renderRFCs(allRfcs)
  xml += await renderSubseries(allRfcs, allSubseries, 'std', true)
  xml += '</rfc-index>'

  // Validate XML with XSD
  const xsdDocument = XsdValidator.fromDoc(XmlDocument.fromString(xsd))
  const xmlDocument = XmlDocument.fromString(xml)
  try {
    xsdDocument.validate(xmlDocument)
  } catch (e) {
    const lines = xml.split('\n')
    if (e instanceof XmlValidateError) {
      console.error(
        e.details
          .map((detail) => {
            const nearby = lines
              .slice(
                Math.max(0, detail.line - 5),
                Math.min(lines.length, detail.line + 5)
              )
              .join('')
            return `${detail.message}\n${nearby}`
          })
          .join('\n')
      )
    } else {
      console.error('rfc-index.xml validiation failure during regeneration', e)
    }
    throw e
  }

  return { xml, xsd }
}

const createElementNSFactory =
  (doc: Document) =>
  (nodeName: string, text?: string): Element => {
    const element = doc.createElementNS(RPC_NAMESPACE, nodeName)
    if (text) {
      const textNode = doc.createTextNode(text)
      element.append(textNode)
    }
    return element
  }

const createElementListNSFactory = (doc: Document) => {
  const createElementNS = createElementNSFactory(doc)
  return (
    listNodeName: string,
    listItemNodeName: string,
    texts: string[]
  ): Element => {
    const element = doc.createElementNS(RPC_NAMESPACE, listNodeName)
    texts.forEach((text) => {
      const childElement = createElementNS(listItemNodeName)
      const textNode = doc.createTextNode(text)
      childElement.appendChild(textNode)
      element.appendChild(childElement)
    })
    return element
  }
}

const renderRFCs = async (allRfcs: Readonly<RfcCommon[]>): Promise<string> => {
  const parser = await getDOMParser()

  const doc = parser.parseFromString('<div></div>', 'application/xml')
  const createElementNS = createElementNSFactory(doc)
  const createElementListNS = createElementListNSFactory(doc)
  const responseXml: string[] = []

  allRfcs.forEach((rfc) => {
    // Based on https://github.com/rfc-editor/rpcwebsite/blob/edf4896c1d97fdd79a78ee6145e3a0c5ffb11fb9/rfc-ed/bin/xmlIndex.pl

    const maybeDateParts = rfc.published
      ? DateTime.fromISO(rfc.published).toFormat('LLLL yyyy').split(' ')
      : undefined

    const rfcEntry = createElementNS('rfc-entry')

    rfcEntry.appendChild(createElementNS('doc-id', `RFC${rfc.number}`))
    rfcEntry.appendChild(createElementNS('title', rfc.title))

    if (rfc.authors.length > 0) {
      rfc.authors.forEach((author) => {
        const authorElement = createElementNS('author')
        authorElement.appendChild(
          createElementNS('name', formatAuthor(author, 'regular'))
        )
        rfcEntry.appendChild(authorElement)
      })
    } else {
      // FIXME: every RFC should have authors. We should throw if attempting to generate an RFC with an empty author
      rfcEntry.appendChild(createElementListNS('author', 'name', ['']))
    }

    if (maybeDateParts) {
      const [month, year] = maybeDateParts
      const dateElement = createElementNS('date')
      dateElement.appendChild(createElementNS('month', month))
      dateElement.appendChild(createElementNS('year', year))
      rfcEntry.appendChild(dateElement)
    }

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

    if (rfc.keywords && rfc.keywords.length > 0) {
      rfcEntry.appendChild(createElementListNS('keywords', 'kw', rfc.keywords))
    }

    if (rfc.abstract && rfc.abstract.length > 0) {
      rfcEntry.appendChild(
        createElementListNS('abstract', 'p', rfc.abstract.split('\n'))
      )
    }

    if (rfc.obsoletes && rfc.obsoletes.length > 0) {
      rfcEntry.appendChild(
        createElementListNS(
          'obsoletes',
          'doc-id',
          rfc.obsoletes.map((obsolete) => `RFC${obsolete.number}`)
        )
      )
    }

    if (rfc.obsoleted_by && rfc.obsoleted_by.length > 0) {
      rfcEntry.appendChild(
        createElementListNS(
          'obsoleted-by',
          'doc-id',
          rfc.obsoleted_by.map((item) => `RFC${item.number}`)
        )
      )
    }

    if (rfc.updated_by && rfc.updated_by.length > 0) {
      rfcEntry.appendChild(
        createElementListNS(
          'updated-by',
          'doc-id',
          rfc.updated_by.map((item) => `RFC${item.number}`)
        )
      )
    }

    if (rfc.draft) {
      rfcEntry.appendChild(createElementNS('draft', rfc.draft.slug))
    }

    rfcEntry.appendChild(
      createElementNS('current-status', rfc.status.name.toUpperCase())
    )

    // FIXME: is this the correct RFC Commmon property to use?
    rfcEntry.appendChild(
      createElementNS('publication-status', rfc.status.name.toUpperCase())
    )

    rfcEntry.appendChild(createElementNS('stream', rfc.stream.slug))

    if (rfc.area?.acronym) {
      rfcEntry.appendChild(createElementNS('area', rfc.area.acronym))
      if (rfc.group) {
        rfcEntry.appendChild(
          createElementNS(
            'wg_acronym',
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
        rfcEntry.appendChild(createElementNS(identifier.type, identifier.value))
      })
    }

    responseXml.push(`${deleteDefaultNamespaces(rfcEntry.outerHTML)}\n`)
  })

  return responseXml.join('')
}

const renderSubseries = async (
  allRfcs: Readonly<RfcCommon[]>,
  allSubseries: Readonly<InfoSubseriesItem[]>,
  subseriesType: string,
  shouldRenderFirstContentsAsTitle: boolean
): Promise<string> => {
  const parser = await getDOMParser()
  const doc = parser.parseFromString('<div></div>', 'application/xml')
  const createElementNS = createElementNSFactory(doc)
  const createElementListNS = createElementListNSFactory(doc)

  const responseXml: string[] = []
  const subseries = allSubseries.filter(
    (subseriesDoc) => subseriesDoc.type === subseriesType
  )

  subseries.forEach((subseriesItem) => {
    const entry = createElementNS(`${subseriesItem.type}-entry`)
    entry.appendChild(
      createElementNS('doc-id', `${subseriesItem.type.toUpperCase()}${subseriesItem.number}`)
    )
    if (shouldRenderFirstContentsAsTitle) {
      let title = ''
      if (subseriesItem.contents.length > 0) {
        const firstSubseriesDoc = subseriesItem.contents[0]
        const referencedRfc = allRfcs.find(
          (rfc) => rfc.number === firstSubseriesDoc.number
        )
        if (referencedRfc) {
          title = referencedRfc.title
        }
      }
      entry.appendChild(createElementNS('title', title))
    }
    const docIds = subseriesItem.contents.map(
      (content) => `RFC${content.number}`
    )
    if (docIds.length > 0) {
      entry.appendChild(createElementListNS('is-also', 'doc-id', docIds))
    }
    responseXml.push(`${deleteDefaultNamespaces(entry.outerHTML)}\n`)
  })

  return responseXml.join('')
}
