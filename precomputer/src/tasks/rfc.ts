import { DateTime } from 'luxon'
import { fetchSourceRfcHtml, rfcBucketHtmlToRfcDocument } from './rfc-html.ts'
import { fetchRfcPDF, rfcBucketPdfToRfcDocument } from './rfc-pdf.ts'
import {
  rfcHtmlJsonPathBuilder,
  rfcJsonPathBuilder,
  rfcCommonPathBuilder,
  rfcRefPathBuilder,
  saveToS3,
  getFromS3
} from '../utilities/s3.ts'
import { getRfcCommonCached } from '../utilities/api.ts'
import { rfcToRfcJson } from '../utilities/rfc-json.ts'
import { RfcCommonSchema } from '../../../website/app/utilities/rfc-validators.ts'
import type {
  RfcBucketHtmlDocument,
  RfcCommon
} from '../../../website/app/utilities/rfc-validators.ts'
import { validateDocument } from '../utilities/validate-zod.ts'
import { RfcJsonSchema } from '../utilities/rfc-json.ts'
import { infoRfcPathBuilder, PUBLIC_SITE_URL_ORIGIN } from '../utilities/url.ts'
import {
  formatAuthor,
  formatIdentifiers
} from '../utilities/rfc-converters-utils.ts'
import { getErrataForRfc } from '../utilities/errata.ts'

export const uploadRfcData = async (rfcNumber: number): Promise<boolean> => {
  const result = await Promise.all([
    uploadRfcHtml(rfcNumber),
    uploadRfcJson(rfcNumber),
    uploadRfcCommonJson(rfcNumber),
    uploadRefsRef(rfcNumber)
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

export const uploadRfcJson = async (rfcNumber: number): Promise<boolean> => {
  const rfc = await getRfcCommonCached(rfcNumber)
  if (rfc === null) {
    return false
  }
  const rfcJSON = rfcToRfcJson(rfc)
  validateDocument(rfcJSON, RfcJsonSchema)
  const rfcJsonS3Path = rfcJsonPathBuilder(rfcNumber)
  await saveToS3(rfcJsonS3Path, JSON.stringify(rfcJSON))
  return true
}

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

  return `${rfc.authors.map((author) => formatAuthor(author, 'brief'))}, "${
    rfc.title
  }", RFC ${rfc.number}, ${formatIdentifiers(rfc.identifiers, ' ').join(
    ''
  )}, ${DateTime.fromISO(published).toFormat(
    'LLLL yyyy'
  )}, <${PUBLIC_SITE_URL_ORIGIN}${infoRfcPathBuilder(rfc)}>.\n`
}
