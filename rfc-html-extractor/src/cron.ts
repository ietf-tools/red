import { uploadHomepageLatest } from './tasks/homepage-latest.ts'
import { uploadFeeds } from './tasks/rfc-feeds.ts'
import { uploadRfcIndexTxt } from './tasks/rfc-index-txt.ts'
import { uploadRfcIndexXml } from './tasks/rfc-index-xml.ts'
import { getAllRFCs, getRedClient } from './utilities/redClientGet.ts'

const RFC_NUMBER_MINIMUM_CHAR_WIDTH = 5 // for Red the default width is 5 chars to handle eg RFC10000 (aka the RFC10k problem).

export const processCron = async (): Promise<void> => {
  console.log('Triggered by a cron job')
  const api = getRedClient()
  const allRfcs = await getAllRFCs({ api }).catch((e) => {
    console.error("getAllRFCs error", e)
    throw Error(e)
  })

  await Promise.all([
    uploadHomepageLatest(allRfcs),
    uploadRfcIndexTxt(allRfcs, RFC_NUMBER_MINIMUM_CHAR_WIDTH),
    uploadFeeds(allRfcs),
    uploadRfcIndexXml(allRfcs)
  ])
}
