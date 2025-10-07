import { fetchSourceRfcHtml, rfcBucketHtmlToRfcDocument } from './rfc-html.ts'
import { rfcBucketPdfToRfcDocument } from './rfc-pdf.ts'
import {
  rfcHtmlJsonPathBuilder,
  rfcJsonPathBuilder,
  saveToS3
} from '../utilities/s3.ts'
import { getRfcCommonCached } from '../utilities/redClientGet.ts'
import { rfcToRfcJson } from '../utilities/rfc-converters.ts'
import { RfcJsonSchema } from '../../../client/app/utilities/rfc-validators.ts'
import { validateDocument } from '../utilities/validate-zod.ts'

export const uploadRfcData = async (rfcNumber: number): Promise<boolean> => {
  const result = await Promise.all([
    uploadRfcHtml(rfcNumber),
    uploadRfcJson(rfcNumber)
  ])
  return result.every((didSucceed) => didSucceed)
}

export const uploadRfcHtml = async (rfcNumber: number): Promise<boolean> => {
  const html = await fetchSourceRfcHtml(rfcNumber)
  if (html !== null) {
    const rfcDocFromHtml = await rfcBucketHtmlToRfcDocument(
      html,
      rfcNumber,
      getRfcCommonCached
    )
    await saveToS3(
      rfcHtmlJsonPathBuilder(rfcNumber),
      JSON.stringify(rfcDocFromHtml)
    )
    return true
  }

  console.log(' - trying PDF instead')
  // Some RFCs don't have HTML eg RFC418, so try PDF
  // Note that this will upload page images
  const rfcDocFromPdf = await rfcBucketPdfToRfcDocument(
    rfcNumber,
    true,
    getRfcCommonCached
  )
  console.log(' - received doc', rfcDocFromPdf?.documentHtmlType)
  if (rfcDocFromPdf) {
    const rfcDocS3Path = rfcHtmlJsonPathBuilder(rfcNumber)
    await saveToS3(rfcDocS3Path, JSON.stringify(rfcDocFromPdf))
    console.log(` - uploaded rfcDoc for ${rfcDocS3Path}`)
    return true
  }
  console.error(` - nothing else to try after PDF for RFC ${rfcNumber}`)
  return false
}

export const uploadRfcJson = async (rfcNumber: number): Promise<boolean> => {
  const rfc = await getRfcCommonCached(rfcNumber)
  const rfcJSON = rfcToRfcJson(rfc)
  validateDocument(rfcJSON, RfcJsonSchema)
  const rfcJsonS3Path = rfcJsonPathBuilder(rfcNumber)
  await saveToS3(rfcJsonS3Path, JSON.stringify(rfcJSON))
  return true
}
