import { DateTime } from 'luxon'
import {
  apiRfcBucketDocumentURLBuilder,
} from '../utilities/url.ts'
import { gc } from '../utilities/gc.ts'
import {
  BLANK_HTML,
  getDOMParser,
  rfcDocumentToPojo
} from '../utilities/dom.ts'
import { rfcImageFileNameBuilder, rfcMetaThumbnailPathBuilder } from '../utilities/s3.ts'
import {
  type TableOfContents,
  type RfcBucketHtmlDocument,
  type RfcCommon,
  RfcBucketHtmlDocumentSchema
} from '../../../website/app/utilities/rfc-validators.ts'
import {
  getMetaScreenshotOfPage,
  getTextDetails,
  takeScreenshotOfPage,
} from '../utilities/unpdf-parent.ts'
import { validateDocument } from '../utilities/validate-zod.ts'
import { getFromS3 } from '../utilities/s3.ts'
import { redactRfc } from './rfc.ts'
import { OPENGRAPH_IMAGE_DIMENSIONS } from '../utilities/html.ts'

export const fetchRfcPDF = async (
  rfcNumber: number
): Promise<string | null> => {
  const key = `pdf/rfc${rfcNumber}.pdf`
  const blob = await getFromS3('S3_RFC_BUCKET', key, 'base64')
  if (!blob) {
    console.warn(
      `[RFC ${rfcNumber}] PDF from ${JSON.stringify(key)} not available`
    )
    return null
  }
  if (blob instanceof Uint8Array) {
    return new TextDecoder().decode(blob)
  }
  return blob
}

/**
 * Note that this also uploads page screenshots
 */
export const rfcBucketPdfToRfcDocument = async (
  rfcNumber: number,
  shouldUploadPageImagesToS3: boolean,
  getRfcCommon: (rfcNumber: number) => Promise<RfcCommon | null>,
  getRfcPDF: typeof fetchRfcPDF
): Promise<RfcBucketHtmlDocument | null> => {
  const base64Pdf = await getRfcPDF(rfcNumber)

  if (base64Pdf === null) {
    return null
  }

  console.log(`[RFC ${rfcNumber}] Found rfc${rfcNumber}.pdf`)

  await gc()

  const domParser = await getDOMParser()
  const dom = domParser.parseFromString(BLANK_HTML, 'text/html')

  const tableOfContents: TableOfContents = {
    title: 'In this PDF',
    sections: []
  }

  // FIXME: the extracted altText has unnecessary spaces in it, breaking up words and harming readability
  // perhaps consider instead of alt text just rendering transparent text in the page like PDF.js does. We could
  // extract the coordinaate of text and overlay it. I have no reason to think this would be better for screen readers
  // but it might allow copy pasting of text (albeit with unnecessary spaces)
  const textDetails = await getTextDetails(base64Pdf)

  const pdfPages = dom.createElement('div')
  pdfPages.setAttribute('data-component', 'PdfPages')
  dom.body.appendChild(pdfPages)

  for (
    let pageNumber = 1;
    pageNumber <= textDetails.text.totalPages;
    pageNumber++
  ) {
    const fileName = rfcImageFileNameBuilder(rfcNumber, pageNumber)

    await gc() // attempt to free memory from fork in unpdf-parent/child
    const screenshot = await takeScreenshotOfPage({
      base64Pdf,
      pageNumber,
      fileName,
      shouldUploadToS3: shouldUploadPageImagesToS3,
      widthPx: 1000,
    })

    const pageTitle = `Page ${pageNumber}`
    const domId = `page${pageNumber}`

    // Extract alt text
    const pageText = textDetails.text.text[pageNumber - 1]

    tableOfContents.sections.push({
      links: [
        {
          title: pageTitle,
          id: domId
        }
      ]
    })

    const pageNode = dom.createElement('div')

    if (pageNumber > 1) {
      // add a divider between pages
      const pageHr = dom.createElement('hr')
      pageNode.appendChild(pageHr)
    }

    const pageImg = dom.createElement('img')
    pageImg.setAttribute('src', apiRfcBucketDocumentURLBuilder(fileName))
    pageImg.setAttribute('id', domId)
    pageImg.setAttribute('width', screenshot.screenshotDimensions.widthPx.toString())
    pageImg.setAttribute('height', screenshot.screenshotDimensions.heightPx.toString())
    pageImg.setAttribute('alt', `Page ${pageNumber}: ${pageText}`)
    if (pageNumber >= 2) {
      // for pages 2+ we'll lazy load images
      // https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/img#loading
      pageImg.setAttribute('loading', 'lazy')
    }
    pageNode.appendChild(pageImg)
    pdfPages.append(pageNode)
  }

  let rfc = await getRfcCommon(rfcNumber)

  if (rfc === null) {
    return null
  }

  rfc = redactRfc(rfc)

  console.log(
    `[RFC ${rfcNumber}] screenshotted ${textDetails.text.totalPages} pages of a PDF`
  )

  const response: RfcBucketHtmlDocument = {
    rfc,
    tableOfContents,
    documentHtmlType: 'pdf-or-ps',
    documentHtmlObj: rfcDocumentToPojo(Array.from(dom.body.childNodes)),
    maxPreformattedLineLength: {
      // won't be used for a PDF document
      max: 80
    },
    timestampIso: DateTime.now().toUTC().toISO()
  }

  validateDocument(response, RfcBucketHtmlDocumentSchema)

  return response
}

export const getRfcPdfMetaScreenshot = async (rfcNumber: number, getRfcPDF: typeof fetchRfcPDF): Promise<Buffer | undefined> => {
  // Don't use PDF for thumbnails. It's too inconsistant and
  // is usually illegible when thumbnail is shrunk to fit a
  // social media card. Instead use HTML version which has
  // very large text for this purpose.

  // this code may be deleted and is currently (2026) here
  // if we decide to use use PDFs despite their faults, or
  // perhaps as part of a screenshot in a thumbnail etc

  const base64Pdf = await getRfcPDF(rfcNumber)

  if (base64Pdf === null) {
    return undefined
  }

  await gc()

  const result = await getMetaScreenshotOfPage({
    base64Pdf,
    pageNumber: 1,
    fileName: rfcMetaThumbnailPathBuilder(rfcNumber),
    shouldUploadToS3: false,
    dimensions: OPENGRAPH_IMAGE_DIMENSIONS
  })

  return Buffer.from(result.base64Png, 'base64');
}