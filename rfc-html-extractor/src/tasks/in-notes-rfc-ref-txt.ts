import { DateTime } from 'luxon'
import { padStart } from 'lodash-es'
import {
  formatAuthor,
  formatIdentifiers
} from '../utilities/rfc-converters-utils.ts'
import type { RfcCommon } from '../../../client/app/utilities/rfc-validators.ts'
import { IN_NOTES_RFC_REF_DOT_TXT_PATH, saveToS3 } from '../utilities/s3.ts'
import { PUBLIC_SITE } from '../utilities/url.ts'

export const uploadInNotesRfcRefDotTxt = async (
  allRfcs: Readonly<RfcCommon[]>,
  rfcNumberColumnMinimumCharWidth: number
): Promise<boolean> => {
  const txt = await renderInNotesRfcRefDotTxt(
    allRfcs,
    rfcNumberColumnMinimumCharWidth
  )
  await saveToS3(IN_NOTES_RFC_REF_DOT_TXT_PATH, txt)
  console.log('Uploaded', IN_NOTES_RFC_REF_DOT_TXT_PATH)
  return true
}

const COLUMN_PADDING = 1

export const renderInNotesRfcRefDotTxt = async (
  allRfcs: Readonly<RfcCommon[]>,
  rfcNumberColumnMinimumCharWidth: number
): Promise<string> => {
  const rfcNumberColumnCalculatedCharWidth = allRfcs.reduce(
    (acc, rfc): number => Math.max(acc, rfc.number.toString().length),
    0
  )
  const rfcNumberColumnCharWidth = Math.max(
    rfcNumberColumnMinimumCharWidth,
    rfcNumberColumnCalculatedCharWidth
  )
  // const column1Width = rfcNumberColumnCharWidth + COLUMN_PADDING
  // const column2width = 72 - rfcNumberColumnCharWidth

  const layout: Layout = {
    longestRfcNumberLength: rfcNumberColumnCharWidth
  }

  let txts: string[] = [getHeader(layout)]

  // This was a .map() callback but that got a 'RangeError: Maximum call stack size exceeded'
  // so it's a simple forloop to avoid callback functions on the stack.
  for (let i = 0; i < allRfcs.length; i++) {
    const rfc = allRfcs[i]

    const rfcText = stringifyRFC(rfc)
    txts.push(
      [
        // No RFC prefix on these results
        padStart(
          `RFC${rfc.number.toString()}`,
          rfcNumberColumnCharWidth + 3,
          ' '
        ),
        ' | ',
        padStart(
          rfc.obsoleted_by
            ?.map((obsoleted_by_item) => `RFC${obsoleted_by_item.number}`)
            .join(', ') ?? '',
          rfcNumberColumnCharWidth + 5,
          ' '
        ),
        ' | ',
        rfcText,
        '\n'
      ].join('')
    )
  }

  return txts.join('')
}

type Layout = {
  longestRfcNumberLength: number
}

const stringifyRFC = (rfc: RfcCommon): string => {
  let rfcdate = ''
  let also = ''
  let doi = ''

  if (rfc.title === 'Not Issued') {
    return 'Not Issued.'
  } else {
    rfcdate = rfc.published
      ? DateTime.fromISO(rfc.published).toFormat('LLLL yyyy')
      : ''

    const alsolist = [
      ...(rfc.is_also && rfc.is_also.length > 0 ? rfc.is_also : []),
      ...(rfc.see_also && rfc.see_also.length > 0 ? rfc.see_also : [])
    ]
    if (alsolist.length > 0) {
      also = `${alsolist.map((rfcId) => `RFC ${rfc.number}`).join(', ')}, `
    }

    doi = formatIdentifiers(rfc.identifiers, ' ').join(' ')

    return `${rfc.authors
      .map((author) => formatAuthor(author, 'reverse'))
      .join(', ')}, "${rfc.title}", ${also}RFC ${rfc.number}, ${doi},${
      rfcdate ? ` ${rfcdate},` : ''
    } <${PUBLIC_SITE}/info/rfc${rfc.number}/>.`
  }
}

const getHeader = (layout: Layout): string => {
  const whitespaceForColumnWidth = ' '.repeat(layout.longestRfcNumberLength - 3)
  const hyphenForColumnWidth = '-'.repeat(layout.longestRfcNumberLength - 3)

  return `${whitespaceForColumnWidth}Number |${whitespaceForColumnWidth}Obsoleted |        Reference
       ${whitespaceForColumnWidth}|${whitespaceForColumnWidth}    By    |          
-------${hyphenForColumnWidth}+----------${hyphenForColumnWidth}+--------------------------------------------------------------------------------------------------

`
}
