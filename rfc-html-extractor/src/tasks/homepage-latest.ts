import { z } from 'zod'
import { HOMEPAGE_LATEST_PATH, saveToS3 } from '../utilities/s3.ts'
import { HomepageLatestSchema } from '../../../client/app/utilities/rfc-validators.ts'
import type { RfcCommon } from '../../../client/app/utilities/rfc-validators.ts'
import { validateDocument } from '../utilities/validate-zod.ts'

export const uploadHomepageLatest = async (
  allRfcs: Readonly<RfcCommon[]>
): Promise<boolean> => {
  const homepageLatest = await renderHomepageLatest(allRfcs)
  await saveToS3(HOMEPAGE_LATEST_PATH, JSON.stringify(homepageLatest))
  console.log('Uploaded homepage latest RFCs')
  return true
}

type HomepageLatest = z.infer<typeof HomepageLatestSchema>

export const renderHomepageLatest = async (
  allRfcs: Readonly<RfcCommon[]>
): Promise<HomepageLatest> => {
  const response = { homepageLatest: allRfcs.slice(-3) }
  validateDocument(response, HomepageLatestSchema)
  return response
}
