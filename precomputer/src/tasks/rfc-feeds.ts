import { DateTime } from 'luxon'
import { escape as escapeHtml } from 'es-toolkit'
import { Feed, type Item, type FeedOptions } from 'feed'
import type { RfcCommon } from '../../../website/app/utilities/rfc-validators.ts'
import { infoRfcPathBuilder, PUBLIC_SITE_URL_ORIGIN } from '../utilities/url.ts'
import { RFC_FEED_ATOM_PATH, RFC_FEED_RSS_PATH, saveToS3 } from '../utilities/s3.ts'
import { type AsyncTaskItem } from '../utilities/task.ts'
import { sortByRfcPublish } from '../utilities/rfc-sorting.ts'
import { sanitiseHtml } from '../utilities/html.ts'

const NUMBER_OF_RFCS_IN_FEED = 15

const cannotUseUnpublishedMessage = 'Cannot add unpublished RFCs to feed. These should have been removed earlier.'

export const uploadFeeds = async (allRfcs: Readonly<RfcCommon[]>): AsyncTaskItem => {
  const { rss2, atom1 } = await renderFeeds(allRfcs)

  await Promise.all([saveToS3(RFC_FEED_RSS_PATH, rss2), saveToS3(RFC_FEED_ATOM_PATH, atom1)])

  console.log('Uploaded', RFC_FEED_RSS_PATH, RFC_FEED_ATOM_PATH)

  return [RFC_FEED_RSS_PATH, RFC_FEED_ATOM_PATH]
}

export const renderFeeds = async (allRfcs: Readonly<RfcCommon[]>): Promise<{ rss2: string; atom1: string }> => {
  if (allRfcs.length < NUMBER_OF_RFCS_IN_FEED) {
    throw Error(
      `Too few RFCs to render into feed. This should not happen. Expected at least ${NUMBER_OF_RFCS_IN_FEED} RFCs`
    )
  }

  const feedRfcs = allRfcs.toSorted(sortByRfcPublish).slice(0, NUMBER_OF_RFCS_IN_FEED)

  // validate we've got valid data
  if (feedRfcs.some((feedRfc) => feedRfc.published === undefined)) {
    console.error(cannotUseUnpublishedMessage, JSON.stringify(feedRfcs))
    throw Error(cannotUseUnpublishedMessage)
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

  const feedItems = await Promise.all(
    feedRfcs.map(async (feedRfc): Promise<Item> => {
      const { published } = feedRfc
      if (published === undefined) {
        throw Error(cannotUseUnpublishedMessage)
      }
      const url = `${PUBLIC_SITE_URL_ORIGIN}${infoRfcPathBuilder(feedRfc)}`
      const item: Item = {
        title: `RFC ${feedRfc.number}: ${feedRfc.title}`,
        link: url,
        description: await renderPlaintextAbstractToHtml(feedRfc.abstract),
        date: DateTime.fromISO(published).toJSDate()
      }
      return item
    })
  )

  feedItems.forEach((item) => feed.addItem(item))

  return {
    rss2: feed.rss2(),
    atom1: feed.atom1()
  }
}

const renderPlaintextAbstractToHtml = async (abstract: RfcCommon['abstract']): Promise<undefined | string> => {
  if (!abstract) {
    return undefined
  }
  const rawAbstract = abstract
    .trim()
    .split('\n')
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join('')

  return sanitiseHtml(rawAbstract, 'abstract')
}
