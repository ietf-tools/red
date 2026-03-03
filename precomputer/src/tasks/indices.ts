import { uploadHomepageLatest } from './homepage-latest.ts'
import { uploadInNotesRfcRefDotTxt } from './in-notes-rfc-ref-txt.ts'
import { FIXME_uploadReportsCurrentQStatsTxt } from './reports-current-queue-stats-txt.ts'
import { uploadFeeds } from './rfc-feeds.ts'
import { uploadRfcMiniIndexJson } from './rfc-mini-index-json.ts'
import { uploadAllSubseries } from './info-subseries.ts'
import {
    getAllRFCs,
    getAllSubseries,
} from '../utilities/api.ts'
import { ApiClient } from '../../generated/api-client.ts'

const RFC_NUMBER_MINIMUM_CHAR_WIDTH = 5 // for Red the default width is 5 chars to handle eg RFC10000 (aka the RFC10k problem).

type Props = {
    api: ApiClient
}

export const indices = async ({ api, }: Props): Promise<boolean> => {
    console.log("Generating indices")
    const [allRfcs, allSubseries] = await Promise.all([
        getAllRFCs({ api }),
        getAllSubseries({ api })
    ])

    const results = await Promise.all([
        uploadHomepageLatest(allRfcs),
        uploadRfcMiniIndexJson(allRfcs),
        uploadFeeds(allRfcs),
        uploadInNotesRfcRefDotTxt(allRfcs, RFC_NUMBER_MINIMUM_CHAR_WIDTH),
        uploadAllSubseries(allSubseries),
        FIXME_uploadReportsCurrentQStatsTxt()
    ])

    return results.every(isSuccessful => isSuccessful)
}