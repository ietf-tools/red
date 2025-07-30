/**
 * This is derived from https://github.com/ietf-tools/red-rfc-html-extractor/blob/main/src/utils.ts
 *
 * Only the imports have changed.
 */

import {
  elementAttributesToObject,
  getDOMParser,
  isHtmlElement,
  isTextNode
} from '../dom'
import { blankRfcCommon } from '../rfc'
import type { RfcEditorToc } from '../tableOfContents'
import { assertNever } from '../typescript'
import { RfcBucketHtmlDocumentSchema } from '../rfc-validators'
import type {
  RfcCommon,
  RfcBucketHtmlDocument,
  DocumentPojo,
  NodePojo
} from '../rfc-validators'
import {
  getPlaintextRfcDocument,
  parsePlaintextBody,
  parsePlaintextHead,
  getPlaintextMaxLineLength
} from './plaintext'
import {
  getXml2RfcRfcDocument,
  parseXml2RfcBody,
  parseXml2RfcHead,
  getXml2RfcMaxLineLength
} from './xml2rfc'

export const fetchSourceRfcHtml = async (
  rfcNumber: number
): Promise<string> => {
  const url = `https://www.rfc-editor.org/rfc-neue/rfc${rfcNumber}.html`
  const response = await fetch(url)
  if (!response.ok) {
    throw Error(
      `Unable to fetch ${url}: ${response.status} ${response.statusText}`
    )
  }
  return response.text()
}

export type RfcAndToc = {
  rfc: RfcCommon
  tableOfContents?: RfcEditorToc
}

export const rfcBucketHtmlToRfcDocument = async (
  rfcBucketHtml: string,
  rfcId: string
): Promise<RfcBucketHtmlDocument> => {
  const parser = await getDOMParser()
  const dom = parser.parseFromString(rfcBucketHtml, 'text/html')

  const rfcAndToc: RfcAndToc = {
    rfc: structuredClone(blankRfcCommon),
    tableOfContents: undefined
  }

  const documentHtmlType = sniffRfcBucketHtmlType(dom)

  let maxPreformattedLineLength = 80

  let rfcDocument: Node[] = []

  switch (documentHtmlType) {
    case 'plaintext':
      parsePlaintextHead(dom.head, rfcAndToc)
      parsePlaintextBody(dom.body, rfcAndToc)
      rfcDocument = getPlaintextRfcDocument(dom)
      maxPreformattedLineLength = getPlaintextMaxLineLength(dom)
      break
    case 'xml2rfc':
      parseXml2RfcHead(dom.head, rfcAndToc)
      parseXml2RfcBody(dom.body, rfcAndToc)
      rfcDocument = getXml2RfcRfcDocument(dom)
      maxPreformattedLineLength = getXml2RfcMaxLineLength(dom)
      break
    default:
      assertNever(documentHtmlType)
      break
  }

  const response: RfcBucketHtmlDocument = {
    rfc: rfcAndToc.rfc,
    tableOfContents: rfcAndToc.tableOfContents,
    documentHtmlType,
    documentHtmlObj: rfcDocumentToPojo(rfcDocument),
    maxPreformattedLineLength
  }

  const validationResult = RfcBucketHtmlDocumentSchema.safeParse(response)

  if (validationResult.error) {
    const errorTitle = `Failed to convert ${rfcId} due to validation error:`
    console.log(errorTitle, validationResult.error)
    throw Error(`${errorTitle}. See console for details.`)
  }

  return validationResult.data
}

export const rfcBucketHtmlFilenameBuilder = (rfcNumber: number) =>
  `rfc${rfcNumber}-html.json`

const sniffRfcBucketHtmlType = (
  dom: Document
): RfcBucketHtmlDocument['documentHtmlType'] => {
  const isPlaintext = dom.querySelector('body > pre')
  const generator = dom.querySelector('meta[name=generator]')

  if (generator) {
    const content = generator.getAttribute('content')
    if (content?.startsWith('xml2rfc')) return 'xml2rfc'
  }

  if (isPlaintext) {
    return 'plaintext'
  }

  throw Error('Unable to sniff RFC HTML type. Please report this error.')
}

const rfcDocumentToPojo = (rfcDocument: Node[]): DocumentPojo => {
  const walk = (node: Node): NodePojo => {
    if (isHtmlElement(node)) {
      return {
        type: 'Element',
        // the nodeName name is either:
        // 1) the data-component attribute (eg, 'HorizontalScrollable')
        // 2) the html element nodeName
        nodeName: node.dataset.component ?? node.nodeName.toLowerCase(),
        attributes: elementAttributesToObject(node.attributes),
        children: Array.from(node.childNodes).map(walk)
      }
    } else if (isTextNode(node)) {
      return {
        type: 'Text',
        textContent: node.textContent ?? ''
      }
    }
    const errorTitle = `rfcDocumentToPojo: Unsupported nodeType ${node.nodeType}`
    console.error(errorTitle, node)
    throw Error(`${errorTitle}. See console for details.`)
  }

  return rfcDocument.map(walk)
}
