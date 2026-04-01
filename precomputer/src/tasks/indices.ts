import { uploadHomepageLatest } from './homepage-latest.ts'
import { uploadInNotesRfcRefDotTxt } from './in-notes-rfc-ref-txt.ts'
import { uploadFeeds } from './rfc-feeds.ts'
import { uploadRfcMiniIndexJson } from './rfc-mini-index-json.ts'
import { uploadAllSubseries } from './info-subseries.ts'
import {
  getAllRFCs,
  getAllSubseries,
} from '../utilities/api.ts'
import { ApiClient } from '../../generated/api-client.ts'
import { uploadMetaThumbnails } from '../utilities/meta-thumbnails.ts'
import { uploadFavicons } from '../utilities/favicons.ts'
import { uploadRobotsTxtEtc } from '../utilities/robots-txt-etc.ts'
import { PUBLIC_SITE_URL_ORIGIN, STAGING_SITE_URL_ORIGIN } from '../utilities/url.ts'

const RFC_NUMBER_MINIMUM_CHAR_WIDTH = 5 // for Red the default width is 5 chars to handle eg RFC10000 (aka the RFC10k problem).

type Props = {
  api: ApiClient
}

export const indices = async ({ api, }: Props): Promise<boolean> => {
  console.log("Generating indices", process.env.S3_RED_BUCKET, Object.keys(process.env))
  const [allRfcs, allSubseries] = await Promise.all([
    getAllRFCs({ api }),
    getAllSubseries({ api })
  ])

  const websiteOrigin = process.env.S3_RED_BUCKET?.includes('staging') ? STAGING_SITE_URL_ORIGIN : PUBLIC_SITE_URL_ORIGIN

  console.log("Using website origin", websiteOrigin)

  const results = await Promise.all([
    uploadHomepageLatest(allRfcs),
    uploadRfcMiniIndexJson(allRfcs),
    uploadFeeds(allRfcs),
    uploadInNotesRfcRefDotTxt(allRfcs, RFC_NUMBER_MINIMUM_CHAR_WIDTH),
    uploadAllSubseries(allSubseries),
    uploadRobotsTxtEtc(websiteOrigin, allRfcs, allSubseries),
    uploadMetaThumbnails(),
    uploadFavicons(),
  ])

  return results.every(isSuccessful => isSuccessful)
}