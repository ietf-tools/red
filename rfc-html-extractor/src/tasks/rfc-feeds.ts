import { DateTime } from 'luxon'
import { Feed } from 'feed'
import type { FeedOptions } from 'feed'
import type { RfcCommon } from '../../../client/app/utilities/rfc-validators.ts'
import { infoRfcPathBuilder, PUBLIC_SITE } from '../utilities/url.ts'
import {
  RFC_FEED_ATOM_PATH,
  RFC_FEED_RSS_PATH,
  saveToS3
} from '../utilities/s3.ts'

const NUMBER_OF_RFCS_IN_FEED = 15

export const uploadFeeds = async (allRfcs: RfcCommon[]): Promise<boolean> => {
  const { rss2, atom1 } = await renderFeeds(allRfcs)

  await Promise.all([
    saveToS3(RFC_FEED_RSS_PATH, rss2),
    saveToS3(RFC_FEED_ATOM_PATH, atom1)
  ])

  return true
}

export const renderFeeds = async (
  allRfcs: RfcCommon[]
): Promise<{ rss2: string; atom1: string }> => {
  if (allRfcs.length <= NUMBER_OF_RFCS_IN_FEED) {
    throw Error(
      `Too few RFCs to render into feed. This should not happen. Expected at least ${NUMBER_OF_RFCS_IN_FEED} RFCs`
    )
  }

  const latestRfc = allRfcs[allRfcs.length - 1]
  const feedRfcs = allRfcs.slice(-NUMBER_OF_RFCS_IN_FEED)

  const updated = DateTime.fromISO(latestRfc.published)
  const feedOptions: FeedOptions = {
    title: 'Recent RFCs',
    description: 'Recently published RFCs',
    id: PUBLIC_SITE,
    link: PUBLIC_SITE,
    generator: 'https://www.npmjs.com/package/feed',
    language: 'en-us', // optional, used only in RSS 2.0, possible values: http://www.w3.org/TR/REC-html40/struct/dirlang.html#langcodes
    copyright: '',
    updated: updated.toJSDate()
  }

  const feed = new Feed(feedOptions)

  feedRfcs.forEach((feedRfc) => {
    const url = `${PUBLIC_SITE}${infoRfcPathBuilder(feedRfc)}`
    feed.addItem({
      title: `RFC ${feedRfc.number}: ${feedRfc.title}`,
      link: url,
      description: feedRfc.abstract,
      date: DateTime.fromISO(feedRfc.published).toJSDate()
    })
  })

  return {
    rss2: feed.rss2(),
    atom1: feed.atom1()
  }
}
