import { ERRATA_JSON_PATH, getFromS3 } from './s3.ts'
import {
  type ErrataList,
  ErrataListSchema
} from '../../../website/app/utilities/rfc-validators.ts'

let _errataListCache: ErrataList | undefined = undefined

export const getAllErrataCached = async () => {
  if (!_errataListCache) {
    const data = await getFromS3('S3_RED_BUCKET', ERRATA_JSON_PATH)
    if (typeof data !== 'string') {
      throw Error(
        `Unable to get ${JSON.stringify(ERRATA_JSON_PATH)}. Response was ${typeof data}`
      )
    }
    const errataUnverified = JSON.parse(data)
    _errataListCache = ErrataListSchema.parse(errataUnverified)

    console.log(`[${ERRATA_JSON_PATH}] cache miss :(`)
  } else {
    console.log(`[${ERRATA_JSON_PATH}] cache hit!`)
  }

  return _errataListCache
}

export const getErrataForRfc = async (rfcNumber: number) => {
  const errataList = await getAllErrataCached()

  return errataList.filter(
    (errataItem) => errataItem['doc-id'] === `RFC${rfcNumber}`
  )
}
