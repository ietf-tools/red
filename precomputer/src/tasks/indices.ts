import { uploadHomepageLatest } from './homepage-latest.ts'
import { uploadRfcRefDotTxt } from './rfc-ref-txt.ts'
import { uploadFeeds } from './rfc-feeds.ts'
import { uploadRfcMiniIndexJson } from './rfc-mini-index-json.ts'
import { uploadAllSubseries } from './info-subseries.ts'
import { getAllRFCs, getAllSubseries } from '../utilities/api.ts'
import { ApiClient } from '../../generated/api-client.ts'
import { uploadMetaThumbnails } from '../utilities/meta-thumbnails.ts'
import { uploadFavicons } from '../utilities/favicons.ts'
import { uploadRobotsTxt } from '../utilities/robots-txt-etc.ts'
import { assertIsString } from '../utilities/typescript.ts'
import { uploadSitemapXmls } from '../utilities/sitemap.ts'
import { uploadRfcIndexXsd } from './rfc-index-xsd.ts'
import { type AsyncTaskItem } from '../utilities/task.ts'
import { filterRFCsByBucketContentExisting } from '../utilities/s3.ts'
import { uploadAllMarkdownPages } from './markdown-pages.ts'

const RFC_NUMBER_MINIMUM_CHAR_WIDTH = 5 // for Red the default width is 5 chars to handle eg RFC10000 (aka the RFC10k problem).

type Props = {
  api: ApiClient
}

export const indices = async ({ api }: Props): AsyncTaskItem => {
  console.log('Generating indices for ', process.env.NUXT_PUBLIC_SITE_BASE)
  const [allRfcs, allSubseries] = await Promise.all([getAllRFCs({ api }), getAllSubseries({ api })])

  // we only want to use rfcs with content available in the bucket
  const allRfcsWithContent = await filterRFCsByBucketContentExisting({ rfcs: allRfcs })

  const websiteOrigin = process.env.NUXT_PUBLIC_SITE_BASE

  assertIsString(websiteOrigin, 'Expected process.env.NUXT_PUBLIC_SITE_BASE to be string')

  const resultsArray = await Promise.all([
    uploadHomepageLatest(allRfcsWithContent),
    uploadRfcMiniIndexJson(allRfcsWithContent),
    uploadFeeds(allRfcsWithContent),
    uploadRfcRefDotTxt(allRfcsWithContent, RFC_NUMBER_MINIMUM_CHAR_WIDTH),
    uploadAllSubseries(allSubseries),
    uploadRobotsTxt(websiteOrigin),
    uploadSitemapXmls(websiteOrigin, allRfcsWithContent, allSubseries),
    uploadMetaThumbnails(),
    uploadRfcIndexXsd(),
    uploadFavicons(),
    uploadAllMarkdownPages()
  ] satisfies AsyncTaskItem[])

  resultsArray.forEach((result, i) => {
    if (result.includes(false)) {
      console.error('indices #', i, ' failed. Was ', result)
    }
  })

  const results = resultsArray.flat()

  return results
}
