import { uploadHomepageLatest } from './tasks/homepage-latest.ts'
import { uploadFeeds } from './tasks/rfc-feeds.ts'
import { uploadRfcIndexTxt } from './tasks/rfc-index-txt.ts'
import { getAllRFCs, getRedClient } from './utilities/redClientGet.ts'

export const processCron = async (): Promise<void> => {
  console.log('Triggered by a cron job')
  const api = getRedClient()
  const allRfcs = await getAllRFCs({ api })

  await Promise.all([
    uploadHomepageLatest(allRfcs),
    uploadRfcIndexTxt(allRfcs),
    uploadFeeds(allRfcs)
  ])
}
