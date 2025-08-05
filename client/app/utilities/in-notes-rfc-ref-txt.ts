import { DateTime } from 'luxon'
import { padStart } from 'lodash-es'
import { FIXME_getRFCMetadataWithMissingData } from './rfc.mocks'
import { parseRFCId } from './rfc'
import { setTimeoutPromise } from './promises'
import { PUBLIC_SITE, infoRfcPathBuilder } from './url'
import { formatAuthor, formatIdentifiers } from './rfc-converters-utils'
import type { ApiClient, RfcMetadata } from '~/generated/red-client'

type DocListArg = Parameters<ApiClient['red']['docList']>[0]

type Props = {
  push: (data: string) => void
  close: () => Promise<void>
  abortController: AbortController
  redApi: ApiClient
  delayBetweenRequestsMs: number
  longestRfcNumberStringLength?: number
}

const DEFAULT_MINIMUM_LENGTH = 4 // test suite may have a client that returns fewer, so we want 4 as the minimum

// Incrementally pushes (streams) RFC results
export async function renderInNotesRfcRefDotTxt({
  push,
  close,
  abortController,
  redApi,
  delayBetweenRequestsMs,
  longestRfcNumberStringLength: _longestRfcNumberStringLength
}: Props) {
  const docListArg: DocListArg = {}

  // extract latest RFC to find largest RFC number for layout reasons.
  // the layout reasons are the two columns in the response, and the first
  // column might need more width if the RFC numbers are wider.
  // ie 4 digit RFC requires 5 chars wide, whereas 5 digit RFC requires 6
  // chars. The 'longest RFC number length' will need to be calculated.
  docListArg.sort = ['-number'] // sort by largest RFC number
  docListArg.limit = 1 // we only need one result

  const response = await redApi.red.docList(docListArg)

  if (response.results.length !== 1) {
    throw Error('Unable to retrieve single response of largest RFC number')
  }
  const largestRfcNumber = response.results[0].number

  const longestRfcNumberStringLength = Math.max(
    DEFAULT_MINIMUM_LENGTH,
    _longestRfcNumberStringLength ?? DEFAULT_MINIMUM_LENGTH,
    largestRfcNumber.toString().length
  )

  const layout: Layout = {
    longestRfcNumberLength: longestRfcNumberStringLength
  }

  if (
    // checking again after the await
    abortController.signal.aborted
  ) {
    return
  }
  push(getHeader(layout))

  docListArg.sort = ['number'] // sort by earliest RFC number
  docListArg.limit = 1000

  let offset = 0

  while (!abortController.signal.aborted) {
    docListArg.offset = offset

    const response = await redApi.red.docList(docListArg)
    if (
      // checking again after the await
      abortController.signal.aborted
    ) {
      return
    }

    push(
      response.results
        .map((rfcMetadata) => {
          const rfcText = stringifyRFC(rfcMetadata)
          return [
            // No RFC prefix on these results
            padStart(
              `RFC${rfcMetadata.number.toString()}`,
              longestRfcNumberStringLength + 3,
              ' '
            ),
            ' | ',
            padStart(
              rfcMetadata.obsoleted_by
                ?.map((obsoleted_by_item) => `RFC${obsoleted_by_item.number}`)
                .join(', ') ?? '',
              longestRfcNumberStringLength + 5,
              ' '
            ),
            ' | ',
            rfcText,
            '\n'
          ].join('')
        })
        .join('')
    )

    if (delayBetweenRequestsMs > 0) {
      // wait between requests so as not to overwhelm the server
      await setTimeoutPromise(delayBetweenRequestsMs)
    }

    if (
      // checking again after the await
      abortController.signal.aborted
    ) {
      return
    }

    if (
      // we've got to the end
      response.results.some(
        (rfcMetadata) => rfcMetadata.number === largestRfcNumber
      )
    ) {
      close()
      return
    }

    // note that due to gaps in RFC number series and API filtering of RFCs there's
    // not a 1:1 relationship in RFC numbers and pagination when sorting by RFC number.
    // ie sort['number] and offset=100 doesn't mean the first result will be RFC0100.
    // so we paginate by results.length
    offset += response.results.length
  }
}

type Layout = {
  longestRfcNumberLength: number
}

const stringifyRFC = (rfcMetadata: RfcMetadata): string => {
  let rfcdate = ''
  let also = ''
  let doi = ''

  const rfc = FIXME_getRFCMetadataWithMissingData(rfcMetadata)

  if (rfc.title === 'Not Issued') {
    return 'Not Issued.'
  } else {
    rfcdate = DateTime.fromISO(rfc.published).toFormat('LLLL yyyy')

    const alsolist = [
      ...(rfc.is_also && rfc.is_also.length > 0 ? rfc.is_also : []),
      ...(rfc.see_also && rfc.see_also.length > 0 ? rfc.see_also : [])
    ]
    if (alsolist.length > 0) {
      also = `${alsolist
        .map((rfcId) => {
          const parts = parseRFCId(rfcId)
          return `${parts.type.toUpperCase()} ${parts.number}`
        })
        .join(', ')}, `
    }

    doi = formatIdentifiers(rfc.identifiers, ' ').join(' ')

    return `${rfc.authors.map((author) => formatAuthor(author, 'reverse')).join(', ')}, "${rfc.title}", ${also}RFC ${rfc.number}, ${doi}, ${rfcdate}, <${PUBLIC_SITE}${infoRfcPathBuilder(`RFC${rfc.number}`)}>.`
  }
}

/**
 * Although this looks superficially like a table, the individual rows can be wider
 * than the column. So it's not really a table and we can't use conventional ASCII table formatters.
 */
const getHeader = (layout: Layout): string => {
  const whitespaceForColumnWidth = ' '.repeat(layout.longestRfcNumberLength - 3)
  const hyphenForColumnWidth = '-'.repeat(layout.longestRfcNumberLength - 3)

  return `${whitespaceForColumnWidth}Number |${whitespaceForColumnWidth}Obsoleted |        Reference
       ${whitespaceForColumnWidth}|${whitespaceForColumnWidth}    By    |          
-------${hyphenForColumnWidth}+----------${hyphenForColumnWidth}+--------------------------------------------------------------------------------------------------

`
}
