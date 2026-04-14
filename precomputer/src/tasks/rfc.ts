import { DateTime } from 'luxon'
import { fetchSourceRfcHtml, rfcBucketHtmlToRfcDocument, getRfcHtmlMetaScreenshot as getRfcHtmlMetaThumbnail } from './rfc-html.ts'
import { fetchRfcPDF, rfcBucketPdfToRfcDocument } from './rfc-pdf.ts'
import {
  rfcHtmlJsonPathBuilder,
  rfcCommonPathBuilder,
  rfcRefPathBuilder,
  rfcMetaThumbnailPathBuilder,
  saveToS3,
  getFromS3
} from '../utilities/s3.ts'
import { getRfcCommonCached } from '../utilities/api.ts'
import { RfcCommonSchema } from '../../../website/app/utilities/rfc-validators.ts'
import type {
  RfcBucketHtmlDocument,
  RfcCommon
} from '../../../website/app/utilities/rfc-validators.ts'
import { validateDocument } from '../utilities/validate-zod.ts'
import { infoRfcPathBuilder, PUBLIC_SITE_URL_ORIGIN } from '../utilities/url.ts'
import {
  formatAuthor,
  formatIdentifiers
} from '../utilities/rfc-converters-utils.ts'
import { getErrataForRfc } from '../utilities/errata.ts'

export const uploadRfcData = async (rfcNumber: number): Promise<boolean> => {
  const result = await Promise.all([
    uploadRfcHtml(rfcNumber),
    uploadRfcCommonJson(rfcNumber),
    uploadRefsRef(rfcNumber),
    uploadRfcMetaThumbnail(rfcNumber)
  ])
  return result.every((didSucceed) => didSucceed)
}

export const uploadRfcHtml = async (rfcNumber: number): Promise<boolean> => {
  const rfcDoc = await getRfcBucketHtmlDocument(rfcNumber)
  if (!rfcDoc) {
    return false
  }
  const rfcDocS3Path = rfcHtmlJsonPathBuilder(rfcNumber)
  await saveToS3(rfcDocS3Path, JSON.stringify(rfcDoc))
  return true
}

export const getRfcBucketHtmlDocument = async (
  rfcNumber: number
): Promise<RfcBucketHtmlDocument | undefined> => {
  const html = await fetchSourceRfcHtml(rfcNumber, getFromS3)
  if (html !== null) {
    const rfcDocFromHtml = await rfcBucketHtmlToRfcDocument(
      html,
      rfcNumber,
      getRfcCommonCached,
      getErrataForRfc
    )
    if (rfcDocFromHtml === null) {
      return undefined
    }
    return rfcDocFromHtml
  }

  console.log(`[RFC ${rfcNumber}] No HTML available. Trying PDF`)

  // Some RFCs don't have HTML eg RFC418, so try PDF
  // Note that this will upload page images
  const rfcDocFromPdf = await rfcBucketPdfToRfcDocument(
    rfcNumber,
    true,
    getRfcCommonCached,
    fetchRfcPDF
  )
  if (rfcDocFromPdf === null) {
    return undefined
  }
  return rfcDocFromPdf
}

export const uploadRfcMetaThumbnail = async (rfcNumber: number): Promise<boolean> => {
  const rfcScreenshot = await getRfcMetaThumbnail({
    rfcNumber,
    getRfcCommon: getRfcCommonCached,
    getRfcHtml: getFromS3,
    fetchRfcPDF,
  })
  if (!rfcScreenshot) {
    return false
  }
  const rfcThumbnailPath = rfcMetaThumbnailPathBuilder(rfcNumber)
  // console.log(`[RFC${rfcNumber}] uploaded thumbnail ${rfcThumbnailPath}`)
  await saveToS3(rfcThumbnailPath, rfcScreenshot)
  return true
}

type RfcMetaScreenshotProps = {
  rfcNumber: number
  getRfcCommon: typeof getRfcCommonCached
  getRfcHtml: typeof getFromS3
  fetchRfcPDF: typeof fetchRfcPDF
}

export const getRfcMetaThumbnail = async ({ rfcNumber, getRfcCommon }: RfcMetaScreenshotProps): Promise<Buffer | undefined> => {
  // Don't use PDF for thumbnails. It's too inconsistant and
  // is usually illegible when thumbnail is shrunk to fit a
  // social media card. Instead use HTML version which has
  // very large text for this purpose.
  //
  // const pdfScreenshot = await getRfcPdfMetaThumbnail(rfcNumber, fetchRfcPDF)
  // if (pdfScreenshot) {
  //   return pdfScreenshot
  // }

  const htmlScreenshot = await getRfcHtmlMetaThumbnail(rfcNumber, getRfcCommon)
  if (htmlScreenshot) {
    return htmlScreenshot
  }  
  return undefined
}

/**
 * Redact info that doesn't need to be in the public file.
 * * format.path: This is a file size optimisation, the website
 *                 doesn't use it
 */
export const redactRfc = (rfc: RfcCommon): RfcCommon => {
  return {
    ...rfc,
    formats: rfc.formats
      .filter((format) => format.format !== 'notprepped')
      .map((format) => {
        return {
          format: format.format
          // omit `format.path`, that's an internal implementation detail that doesn't need to be public and isn't required by the schema
        }
      })
  }
}

export const uploadRfcCommonJson = async (
  rfcNumber: number
): Promise<boolean> => {
  const rfc = await getRfcCommonCached(rfcNumber)
  if (rfc === null) {
    return false
  }
  const redactedRfc = redactRfc(rfc)
  validateDocument(redactedRfc, RfcCommonSchema)
  const rfcCommonS3Path = rfcCommonPathBuilder(redactedRfc.number)
  await saveToS3(rfcCommonS3Path, JSON.stringify(redactedRfc))
  return true
}

export const uploadRefsRef = async (rfcNumber: number): Promise<boolean> => {
  const rfc = await getRfcCommonCached(rfcNumber)
  if (rfc === null) {
    return false
  }
  const rfcRef = renderRefsRef(rfc)
  const rfcRefS3Path = rfcRefPathBuilder(rfcNumber)
  await saveToS3(rfcRefS3Path, rfcRef)
  return true
}

/**
 * Renders RFC summary txt. Eg.
 * ```txt
 * Crocker, S., "Host Software", RFC 1, DOI 10.17487/RFC0001, April 1969, <https://www.rfc-editor.org/info/rfc1>.
 * ```
 *
 * As used on https://www.rfc-editor.org/refs/ref0001.txt
 */
export const renderRefsRef = (rfc: RfcCommon): string => {
  const { published } = rfc
  if (published === undefined) {
    throw Error(`Unexpected lack of 'published' date`)
  }

  return `${rfc.authors.map((author) => formatAuthor(author, 'brief'))}, "${rfc.title
    }", RFC ${rfc.number}, ${formatIdentifiers(rfc.identifiers, ' ').join(
      ''
    )}, ${DateTime.fromISO(published).toFormat(
      'LLLL yyyy'
    )}, <${PUBLIC_SITE_URL_ORIGIN}${infoRfcPathBuilder(rfc)}>.\n`
}
