import { DateTime } from 'luxon'
import { padStart } from 'lodash-es'
import {
  formatAuthor,
  formatIdentifiers
} from '../utilities/rfc-converters-utils.ts'
import type { RfcCommon } from '../../../client/app/utilities/rfc-validators.ts'
import { RFC_INDEX_TXT_PATH, saveToS3 } from '../utilities/s3.ts'

const DEFAULT_RFC_NUMBER_COLUMN_CHAR_WIDTH = 5
const COLUMN_PADDING = 1
const SPACE = ' '

export const uploadRfcIndexTxt = async (
  allRfcs: Readonly<RfcCommon[]>,
  rfcNumberColumnCharWidth: number
): Promise<boolean> => {
  const txt = await renderRfcIndexTxt(allRfcs, rfcNumberColumnCharWidth)
  await saveToS3(RFC_INDEX_TXT_PATH, txt)
  console.log('Generated rfc-index.txt')
  return true
}

export const renderRfcIndexTxt = async (
  allRfcs: Readonly<RfcCommon[]>,
  rfcNumberColumnCharWidth: number
): Promise<string> => {
  const column1Width = rfcNumberColumnCharWidth + COLUMN_PADDING
  const column2width = 72 - rfcNumberColumnCharWidth // yes this will cause reflow once RFC 10k, 100k, etc. occur

  // array of whitespace chars where the index = number of spaces
  const whitespace = new Array(column1Width + 1)
    .fill('')
    .map((_, index) => ' '.repeat(index))

  const layout: Layout = {
    longestRfcNumberLength: rfcNumberColumnCharWidth
  }

  const txtParts: string[] = []
  txtParts.push(getHeader())
  txtParts.push(getIntro(layout))
  txtParts.push('\n\n')
  // This was a .map() callback but that got a 'RangeError: Maximum call stack size exceeded'
  // so it's a simple forloop to avoid callback functions on the stack.
  for (let i = 0; i < allRfcs.length; i++) {
    const rfc = allRfcs[i]
    const rfcText = stringifyRFC(rfc)
    const rfcLines = splitLinesAt(rfcText, column2width)

    const rfcEntry = `${
      // No RFC prefix on these results
      padStart(rfc.number.toString(), rfcNumberColumnCharWidth, ' ')
    }${whitespace[column1Width - rfcNumberColumnCharWidth]}${rfcLines.join(
      `\n${whitespace[column1Width]}`
    )}`

    txtParts.push(rfcEntry)
    txtParts.push(' \n\n')
  }

  return txtParts.join('')
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
  const createdOn = `${padStart(
    (date.getMonth() + 1).toString(),
    2,
    '0'
  )}/${padStart(date.getDate().toString(), 2, '0')}/${date.getFullYear()}` // note the backwards US month/day/year format
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

  ${hashes}${exampleColumnSpacing}${splitLinesAt(
    `Title of RFC.  Author 1, Author 2, Author 3.  Issue date. (Format: ASCII) (Obsoletes xxx) (Obsoleted by xxx) (Updates xxx) (Updated by xxx) (Also FYI ${hashes}) (Status: ssssss) (DOI: ddd)`,
    64
  ).join(`\n${whitespace['8']}`)}

or

  ${hashes}${exampleColumnSpacing}Not Issued.

For example:

  ${padStart('1129', layout.longestRfcNumberLength, ' ')} ${splitLinesAt(
    'Internet Time Synchronization: The Network Time Protocol. D.L. Mills. October 1989. (Format: TXT, PS, PDF, HTML) (Also RFC1119) (Status: INFORMATIONAL) (DOI: 10.17487/RFC1129)',
    64
  ).reduce((acc, line, index) => {
    return `${acc}${
      index > 0
        ? `\n${
            layout.longestRfcNumberLength === 4
              ? whitespace['7']
              : whitespace['8']
          }`
        : ''
    }${line}${index > 0 ? ' ' : ''}`
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

const stringifyRFC = (rfc: RfcCommon): string => {
  // Based on https://github.com/rfc-editor/rpcwebsite/blob/edf4896c1d97fdd79a78ee6145e3a0c5ffb11fb9/rfc-ed/bin/rfc2txt.py#L97
  let obsups = ''
  let rfcdate = ''
  let rfcformat = ''
  let also = ''
  let doi = ''

  if (rfc.title === 'Not Issued') {
    return 'Not Issued.'
  } else {
    rfcdate = DateTime.fromISO(rfc.published).toFormat('LLLL yyyy')
    rfcformat =
      rfc.formats && rfc.formats.length > 0
        ? `Format: ${rfc.formats
            .map((format) => format.toUpperCase())
            .join(', ')}`
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
    return `${rfc.title}. ${rfc.authors
      .map((author) => formatAuthor(author, 'regular'))
      .join(
        ', '
      )}. ${rfcdate}. (${rfcformat})${obsups}${also} (Status: ${rfc.status.toUpperCase()})${doi}`
  }
}

type Layout = {
  longestRfcNumberLength: number
}

const formatRfcNumber = (number: number): string => {
  return `RFC${number.toString()}`
}
