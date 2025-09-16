import { HOMEPAGE_LATEST_PATH, saveToS3 } from '../utilities/s3.ts'
import { HomepageLatestSchema } from '../../../client/app/utilities/rfc-validators.ts'
import type { RfcCommon } from '../../../client/app/utilities/rfc-validators.ts'
import { validateDocument } from '../utilities/validate-doc.ts'

export const uploadHomepageLatest = async (
  allRfcs: RfcCommon[]
): Promise<boolean> => {
  const response = { homepageLatest: allRfcs.slice(-3) }
  validateDocument(response, HomepageLatestSchema)
  await saveToS3(HOMEPAGE_LATEST_PATH, JSON.stringify(response))
  console.log("Generated homepage latest RFCs")
  return true
}
