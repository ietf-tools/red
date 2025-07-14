/**
 * This is derived from https://github.com/ietf-tools/red-rfc-html-extractor/blob/main/src/utils.ts
 *
 * Only the imports have changed.
 */

import { getDOMParser, isHtmlElement, isTextNode } from '../dom'
import { blankRfcCommon } from '../rfc'
import type { RfcCommon, RfcBucketHtmlDocument } from '../rfc'
import type { RfcEditorToc } from '../tableOfContents'
import { assertNever } from '../typescript'
import {
  getPlaintextRfcDocument,
  parsePlaintextBody,
  parsePlaintextHead
} from './plaintext'
import {
  getXml2RfcRfcDocument,
  parseXml2RfcBody,
  parseXml2RfcHead
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
  rfcBucketHtml: string
): Promise<RfcBucketHtmlDocument> => {
  const parser = await getDOMParser()
  const dom = parser.parseFromString(rfcBucketHtml, 'text/html')

  const rfcAndToc: RfcAndToc = {
    rfc: {
      ...blankRfcCommon
    },
    tableOfContents: undefined
  }

  const documentHtmlType = sniffRfcBucketHtmlType(dom)

  let rfcDocument: Node[] = []

  switch (documentHtmlType) {
    case 'plaintext':
      parsePlaintextHead(dom.head, rfcAndToc)
      parsePlaintextBody(dom.body, rfcAndToc)
      rfcDocument = getPlaintextRfcDocument(dom)
      break
    case 'xml2rfc':
      parseXml2RfcHead(dom.head, rfcAndToc)
      parseXml2RfcBody(dom.body, rfcAndToc)
      rfcDocument = getXml2RfcRfcDocument(dom)
      break
    default:
      assertNever(documentHtmlType)
      break
  }

  const documentHtml = rfcDocument
    .map((node): string => {
      if (isHtmlElement(node)) {
        return node.outerHTML
      } else if (isTextNode(node)) {
        return node.textContent ?? ''
      }
      return ''
    })
    .join('')
    .trim()

  return {
    rfc: rfcAndToc.rfc,
    tableOfContents: rfcAndToc.tableOfContents,
    documentHtmlType,
    documentHtml
  }
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
