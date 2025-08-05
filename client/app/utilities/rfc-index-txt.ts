import { DateTime } from 'luxon'
import { padStart } from 'lodash-es'
import { SPACE } from './strings'
import { FIXME_getRFCMetadataWithMissingData } from './rfc.mocks'
import { setTimeoutPromise } from './promises'
import { formatAuthor, formatIdentifiers } from './rfc-converters-utils'
import type { ApiClient, RfcMetadata } from '~/generated/red-client'

// Note: this file is intentionally named rfc-index-txt.ts not rfc-index.txt.ts
// because vitest can't import that later filename

const COLUMN_PADDING = 1

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
export async function renderRfcIndexDotTxt({
  push,
  close,
  abortController,
  redApi,
  delayBetweenRequestsMs,
  longestRfcNumberStringLength: _longestRfcNumberStringLength
}: Props) {
  push(getHeader())

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
  push(getIntro(layout))

  const column1Width = longestRfcNumberStringLength + COLUMN_PADDING
  const column2width = 72 - longestRfcNumberStringLength // yes this will cause reflow once RFC 10k, 100k, etc. occur

  // array of whitespace chars where the index = number of spaces
  const whitespace = new Array(column1Width + 1)
    .fill('')
    .map((_, index) => ' '.repeat(index))

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

    push('\n\n')
    push(
      response.results
        .map((rfcMetadata) => {
          const rfcText = stringifyRFC(rfcMetadata)
          const rfcLines = splitLinesAt(rfcText, column2width)

          return [
            // No RFC prefix on these results
            padStart(
              rfcMetadata.number.toString(),
              longestRfcNumberStringLength,
              ' '
            ),
            whitespace[column1Width - longestRfcNumberStringLength],
            rfcLines.join(`\n${whitespace[column1Width]}`)
          ].join('')
        })
        .join(' \n\n')
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

const formatRfcNumber = (number: number): string => {
  return `RFC${number.toString()}`
}

type Layout = {
  longestRfcNumberLength: number
}

const stringifyRFC = (rfcMetadata: RfcMetadata): string => {
  // Based on https://github.com/rfc-editor/rpcwebsite/blob/edf4896c1d97fdd79a78ee6145e3a0c5ffb11fb9/rfc-ed/bin/rfc2txt.py#L97
  let obsups = ''
  let rfcdate = ''
  let rfcformat = ''
  let also = ''
  let doi = ''

  const rfc = FIXME_getRFCMetadataWithMissingData(rfcMetadata)

  if (rfc.title === 'Not Issued') {
    return 'Not Issued.'
  } else {
    rfcdate = DateTime.fromISO(rfc.published).toFormat('LLLL yyyy')
    rfcformat =
      rfc.formats && rfc.formats.length > 0 ?
        `Format: ${rfc.formats.map((format) => format.toUpperCase()).join(', ')}`
      : ''

    if (rfc.obsoletes && rfc.obsoletes.length > 0) {
      obsups += ` (Obsoletes ${rfc.obsoletes
        .map((item) => formatRfcNumber(item.number))
        .join(', ')})`
    }

    if (rfc.obsoleted_by && rfc.obsoleted_by.length > 0) {
      obsups += ` (Obsoleted by ${rfc.obsoleted_by
        .map((item) => formatRfcNumber(item.number))
        .join(', ')})`
    }
    if (rfc.updates && rfc.updates.length > 0) {
      obsups += ` (Updates ${rfc.updates
        .map((item) => formatRfcNumber(item.number))
        .join(', ')})`
    }
    if (rfc.updated_by && rfc.updated_by.length > 0) {
      obsups += ` (Updated by ${rfc.updated_by
        .map((item) => formatRfcNumber(item.number))
        .join(', ')})`
    }

    const alsolist = [
      ...(rfc.is_also && rfc.is_also.length > 0 ? rfc.is_also : []),
      ...(rfc.see_also && rfc.see_also.length > 0 ? rfc.see_also : [])
    ]
    if (alsolist.length > 0) {
      also = ` (Also ${alsolist.join(', ')})`
    }

    doi = ` ${formatIdentifiers(rfc.identifiers)
      .map((identifier) => `(${identifier})`)
      .join(' ')}`
    return `${rfc.title}. ${rfc.authors.map((author) => formatAuthor(author, 'regular')).join(', ')}. ${rfcdate}. (${rfcformat})${obsups}${also} (Status: ${rfc.status.name.toUpperCase()})${doi}`
  }
}

export const getHeader = (): string => {
  return `

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

                             RFC INDEX
                           -------------

`
}

const getIntro = (layout: Layout): string => {
  const date = new Date()
  const createdOn = `${padStart((date.getMonth() + 1).toString(), 2, '0')}/${padStart(date.getDate().toString(), 2, '0')}/${date.getFullYear()}` // note the backwards US month/day/year format
  const hashes = padStart('', layout.longestRfcNumberLength, '#')
  const letterXs = padStart('', layout.longestRfcNumberLength, 'x')
  const exampleColumnSpacing = layout.longestRfcNumberLength === 4 ? '  ' : ' '
  const whitespace: Record<number, string> = {
    8: padStart('', 8, ' '),
    7: padStart('', 7, ' ')
  }

  return `(CREATED ON: ${createdOn}.)

This file contains citations for all RFCs in numeric order.

RFC citations appear in this format:

  ${hashes}${exampleColumnSpacing}${splitLinesAt(`Title of RFC.  Author 1, Author 2, Author 3.  Issue date. (Format: ASCII) (Obsoletes xxx) (Obsoleted by xxx) (Updates xxx) (Updated by xxx) (Also FYI ${hashes}) (Status: ssssss) (DOI: ddd)`, 64).join(`\n${whitespace['8']}`)}

or

  ${hashes}${exampleColumnSpacing}Not Issued.

For example:

  ${padStart('1129', layout.longestRfcNumberLength, ' ')} ${splitLinesAt(
    'Internet Time Synchronization: The Network Time Protocol. D.L. Mills. October 1989. (Format: TXT, PS, PDF, HTML) (Also RFC1119) (Status: INFORMATIONAL) (DOI: 10.17487/RFC1129)',
    64
  ).reduce((acc, line, index) => {
    return `${acc}${index > 0 ? `\n${layout.longestRfcNumberLength === 4 ? whitespace['7'] : whitespace['8']}` : ''}${line}${index > 0 ? ' ' : ''}`
  }, '')}

Key to citations:

${hashes} is the RFC number.

Following the RFC number are the title, the author(s), and the
publication date of the RFC.  Each of these is terminated by a period.

Following the number are the title (terminated with a period), the
author, or list of authors (terminated with a period), and the date
(terminated with a period).

The format follows in parentheses. One or more of the following formats 
are listed:  text (TXT), PostScript (PS), Portable Document Format 
(PDF), HTML, XML.

Obsoletes ${letterXs} refers to other RFCs that this one replaces;
Obsoleted by ${letterXs} refers to RFCs that have replaced this one.
Updates ${letterXs} refers to other RFCs that this one merely updates (but
does not replace); Updated by ${letterXs} refers to RFCs that have updated
(but not replaced) this one.  Generally, only immediately succeeding
and/or preceding RFCs are indicated, not the entire history of each
related earlier or later RFC in a related series.

The (Also FYI ##) or (Also STD ##) or (Also BCP ##) phrase gives the
equivalent FYI, STD, or BCP number if the RFC is also in those
document sub-series.  The Status field gives the document's
current status (see RFC 2026).  The (DOI ddd) field gives the
Digital Object Identifier.

RFCs may be obtained in a number of ways, using HTTP, FTP, or email.
See the RFC Editor Web page http://www.rfc-editor.org

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

                                RFC INDEX
                                ---------

`
}

export const splitLinesAt = (str: string, lineLength: number): string[] => {
  const lines: string[] = []
  let remainingStr = str
  let position = 0

  while (remainingStr.length > lineLength) {
    // get the string between the last break and this one
    position = remainingStr.lastIndexOf(SPACE, lineLength)

    if (position !== -1) {
      lines.push(remainingStr.substring(0, position).trim())
      remainingStr = remainingStr.substring(position + 1)
    }
  }

  lines.push(remainingStr.trim())

  return lines
}
