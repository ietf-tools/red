import { Feed } from 'feed'
import type { FeedOptions } from 'feed'
import { PUBLIC_SITE, infoRfcPathBuilder } from './url'
import { getRedClient } from './redClientWrappers'
import type { ApiClient } from '~/generated/red-client'

type DocListArg = Parameters<ApiClient['red']['docList']>[0]

export const getFeedForLatestRFCs = async (
  numberOfRFCs: number,
  feedOptions?: FeedOptions
) => {
  const redApi = getRedClient()

  const docListArg: DocListArg = {}

  docListArg.sort = ['-number'] // sort by latest RFC
  docListArg.limit = numberOfRFCs

  const response = await redApi.red.docList(docListArg)

  const feed = new Feed({
    title: 'Recent RFCs',
    description: 'Recently published RFCs',
    id: PUBLIC_SITE,
    link: PUBLIC_SITE,
    generator: 'https://www.npmjs.com/package/feed',
    language: 'en-us', // optional, used only in RSS 2.0, possible values: http://www.w3.org/TR/REC-html40/struct/dirlang.html#langcodes
    copyright: '',
    ...(feedOptions ?? {}),
    updated:
      response.results.length > 0 ?
        parseDateString(response.results[0].published)
      : new Date()
  })

  response.results.forEach((rfcMetadata) => {
    const url = `${PUBLIC_SITE}${infoRfcPathBuilder(`RFC${rfcMetadata.number}`)}`
    feed.addItem({
      title: `RFC ${rfcMetadata.number}: ${rfcMetadata.title}`,
      link: url,
      description: rfcMetadata.abstract,
      date: parseDateString(rfcMetadata.published)
    })
  })

  return feed
}

const parseDateString = (date: string): Date => {
  return new Date(date)
}
