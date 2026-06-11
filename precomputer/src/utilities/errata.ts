import { ERRATA_JSON_PATH, getFromS3 } from './s3.ts'
import { type ErrataList, ErrataListSchema } from '../../../website/app/utilities/rfc-validators.ts'

let _errataListCache: ErrataList | undefined = undefined

export const getAllErrataCached = async (getBucket: typeof getFromS3 = getFromS3) => {
  if (!_errataListCache) {
    const data = await getBucket('S3_RED_BUCKET', ERRATA_JSON_PATH, 'default', ERRATA_JSON_PATH)
    if (typeof data !== 'string') {
      throw Error(`Unable to get ${JSON.stringify(ERRATA_JSON_PATH)}. Response was ${typeof data}`)
    }
    const errataUnverified = JSON.parse(data)
    _errataListCache = ErrataListSchema.parse(errataUnverified)
  }

  return _errataListCache
}

export const getErrataForRfc = async (rfcNumber: number, getBucket: typeof getFromS3 = getFromS3) => {
  const errataList = await getAllErrataCached(getBucket)

  return errataList.filter((errataItem) => errataItem['doc-id'] === `RFC${rfcNumber}`)
}
