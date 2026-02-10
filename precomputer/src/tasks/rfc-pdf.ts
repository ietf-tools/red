import { DateTime } from 'luxon'
import { apiRfcBucketDocumentURLBuilder, PUBLIC_SITE_URL_ORIGIN } from '../utilities/url.ts'
import { gc } from '../utilities/gc.ts'
import { BLANK_HTML, getDOMParser, rfcDocumentToPojo } from '../utilities/dom.ts'
import { rfcImageFileNameBuilder } from '../utilities/s3.ts'
import {
  type TableOfContents,
  type RfcBucketHtmlDocument,
  type RfcCommon,
  RfcBucketHtmlDocumentSchema,
} from '../../../website/app/utilities/rfc-validators.ts'
import {
  getTextDetails,
  takeScreenshotOfPage
} from '../utilities/unpdf-parent.ts'
import { validateDocument } from '../utilities/validate-zod.ts'
import { getFromS3 } from '../utilities/s3.ts'

export const fetchRfcPDF = async (rfcNumber: number): Promise<string | null> => {
  const blob = await getFromS3(`pdf/rfc${rfcNumber}.pdf`, 'base64')
  if (!blob) {
    console.warn(
      `[RFC ${rfcNumber}] PDF from rfc${rfcNumber}.pdf not available`
    )
    return null
  }
  if (blob instanceof Uint8Array) {
    return new TextDecoder().decode(blob);
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
  const base64 = await getRfcPDF(rfcNumber)

  if (base64 === null) {
    return null
  }

  await gc() // attempt to free memory after fetch()

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
  const textDetails = await getTextDetails(base64)

  const pdfPages = dom.createElement('div')
  pdfPages.setAttribute('data-component', 'PdfPages')
  dom.body.appendChild(pdfPages)

  for (
    let pageNumber = 1;
    pageNumber <= textDetails.text.totalPages;
    pageNumber++
  ) {
    const fileName = rfcImageFileNameBuilder(rfcNumber, pageNumber)

    await gc() // attempt to free bytes from fork
    const screenshotDimensions = await takeScreenshotOfPage(
      base64,
      pageNumber,
      fileName,
      shouldUploadPageImagesToS3
    )

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
    pageImg.setAttribute('width', screenshotDimensions.widthPx.toString())
    pageImg.setAttribute('height', screenshotDimensions.heightPx.toString())
    pageImg.setAttribute('alt', `Page ${pageNumber}: ${pageText}`)
    if (pageNumber >= 2) {
      // for pages 2+ we'll lazy load images
      // https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/img#loading
      pageImg.setAttribute('loading', 'lazy')
    }
    pageNode.appendChild(pageImg)
    pdfPages.append(pageNode)
  }

  const rfc = await getRfcCommon(rfcNumber)

  if (rfc === null) {
    return null
  }

  const response: RfcBucketHtmlDocument = {
    rfc,
    tableOfContents,
    documentHtmlType: 'pdf-or-ps',
    documentHtmlObj: rfcDocumentToPojo(Array.from(dom.body.childNodes)),
    maxPreformattedLineLength: {
      // won't be used for a PDF document
      max: 80,
      maxWithAnchorSuffix: 80
    },
    timestampIso: DateTime.now().toUTC().toISO()
  }

  validateDocument(response, RfcBucketHtmlDocumentSchema)

  return response
}
