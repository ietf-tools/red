import { DateTime } from 'luxon'
import { Feed } from 'feed'
import type { FeedOptions } from 'feed'
import type { RfcCommon } from '../../../website/app/utilities/rfc-validators.ts'
import { infoRfcPathBuilder, PUBLIC_SITE_URL_ORIGIN } from '../utilities/url.ts'
import {
  RFC_FEED_ATOM_PATH,
  RFC_FEED_RSS_PATH,
  saveToS3
} from '../utilities/s3.ts'

const NUMBER_OF_RFCS_IN_FEED = 15

export const uploadFeeds = async (
  allRfcs: Readonly<RfcCommon[]>
): Promise<boolean> => {
  const { rss2, atom1 } = await renderFeeds(allRfcs)

  await Promise.all([
    saveToS3(RFC_FEED_RSS_PATH, rss2),
    saveToS3(RFC_FEED_ATOM_PATH, atom1)
  ])

  console.log('Uploaded', RFC_FEED_RSS_PATH, RFC_FEED_ATOM_PATH)

  return true
}

export const renderFeeds = async (
  allRfcs: Readonly<RfcCommon[]>
): Promise<{ rss2: string; atom1: string }> => {
  if (allRfcs.length < NUMBER_OF_RFCS_IN_FEED) {
    throw Error(
      `Too few RFCs to render into feed. This should not happen. Expected at least ${NUMBER_OF_RFCS_IN_FEED} RFCs`
    )
  }

  const feedRfcs = Array.from(allRfcs)
    .filter(rfc => rfc.published)
    .sort(sortByPublished)
    .slice(0, NUMBER_OF_RFCS_IN_FEED)

  const latestRfc = feedRfcs[0]
  const { published: latestRfcPublished } = latestRfc
  if (latestRfcPublished === undefined) {
    console.error('latestRfc.published error', JSON.stringify(latestRfc))
    throw Error('expected published to be available')
  }

  const feedOptions: FeedOptions = {
    title: 'Recent RFCs',
    description: 'Recently published RFCs',
    id: PUBLIC_SITE_URL_ORIGIN,
    link: PUBLIC_SITE_URL_ORIGIN,
    generator: 'https://www.npmjs.com/package/feed',
    language: 'en-us', // optional, used only in RSS 2.0, possible values: http://www.w3.org/TR/REC-html40/struct/dirlang.html#langcodes
    copyright: '',
    updated: new Date()
  }

  const feed = new Feed(feedOptions)

  feedRfcs.forEach((feedRfc) => {
    const { published } = feedRfc
    if (published === undefined) {
      throw Error('Cannot add unpublished RFCs to feed. These should have been removed earlier.')
    }
    const url = `${PUBLIC_SITE_URL_ORIGIN}${infoRfcPathBuilder(feedRfc)}`
    feed.addItem({
      title: `RFC ${feedRfc.number}: ${feedRfc.title}`,
      link: url,
      description: feedRfc.abstract,
      date: makeJsDateFromPublished(published)
    })
  })

  return {
    rss2: feed.rss2(),
    atom1: feed.atom1()
  }
}

const makeLuxonDateFromPublished = (published: string): DateTime => {
  return DateTime.fromISO(published)
}

const makeJsDateFromPublished = (published: string): Date => {
  return makeLuxonDateFromPublished(published).toJSDate()
}

const sortByPublished = (a: RfcCommon, b: RfcCommon): number => {
  const { published: aPublished } = a
  const { published: bPublished } = b
  if (aPublished === undefined || bPublished === undefined) {
    console.error("Can't sort", JSON.stringify(a), JSON.stringify(b))
    throw Error("Can't sort rfcs without 'published'. They should have been filtered earlier. See console for more")
  }
  const aPublishedDate = makeLuxonDateFromPublished(aPublished)
  const bPublishedDate = makeLuxonDateFromPublished(bPublished)
  return bPublishedDate.toMillis() - aPublishedDate.toMillis()
}