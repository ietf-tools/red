import { DateTime } from 'luxon'
import { padStart } from 'es-toolkit/compat'
import { formatAuthor, formatIdentifiers } from '../utilities/rfc-converters-utils.ts'
import type { RfcCommon } from '../../../website/app/utilities/rfc-validators.ts'
import { IN_NOTES_RFC_REF_DOT_TXT_PATH, saveToS3 } from '../utilities/s3.ts'
import { PUBLIC_SITE_URL_ORIGIN } from '../utilities/url.ts'
import { type AsyncTaskItem } from '../utilities/task.ts'
import { formatAuthorsPerStyleGuide } from '../utilities/authors.ts'

export const uploadRfcRefDotTxt = async (
  allRfcs: Readonly<RfcCommon[]>,
  rfcNumberColumnMinimumCharWidth: number
): AsyncTaskItem => {
  const txt = await renderInNotesRfcRefDotTxt(allRfcs, rfcNumberColumnMinimumCharWidth)
  await saveToS3(IN_NOTES_RFC_REF_DOT_TXT_PATH, txt)
  console.log(`[${IN_NOTES_RFC_REF_DOT_TXT_PATH}]`, 'Uploaded', IN_NOTES_RFC_REF_DOT_TXT_PATH)
  return [IN_NOTES_RFC_REF_DOT_TXT_PATH]
}

export const renderInNotesRfcRefDotTxt = async (
  allRfcs: Readonly<RfcCommon[]>,
  rfcNumberColumnMinimumCharWidth: number
): Promise<string> => {
  const rfcNumberColumnCalculatedCharWidth = allRfcs.reduce(
    (acc, rfc): number => Math.max(acc, rfc.number.toString().length),
    0
  )
  const rfcNumberColumnCharWidth = Math.max(rfcNumberColumnMinimumCharWidth, rfcNumberColumnCalculatedCharWidth)

  const layout: Layout = {
    longestRfcNumberLength: rfcNumberColumnCharWidth
  }

  let txts: string[] = [getHeader(layout)]

  // A plain loop: a `.map()` callback over 10k+ RFCs overflowed the call stack.
  for (let i = 0; i < allRfcs.length; i++) {
    const rfc = allRfcs[i]

    const rfcText = stringifyRFC(rfc)
    txts.push(
      [
        padStart(`RFC${rfc.number.toString()}`, rfcNumberColumnCharWidth + 3, ' '),
        ' | ',
        padStart(
          rfc.obsoleted_by?.map((obsoleted_by_item) => `RFC${obsoleted_by_item.number}`).join(', ') ?? '',
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
  let subseries = ''
  let doi = ''

  if (rfc.title === 'Not Issued') {
    return 'Not Issued.'
  } else {
    rfcdate = rfc.published ? DateTime.fromISO(rfc.published).toFormat('LLLL yyyy') : ''

    const subseriesList = [...(rfc.subseries && rfc.subseries.length > 0 ? rfc.subseries : [])]
    if (subseriesList.length > 0) {
      subseries = `${subseriesList.map((subserie) => `${subserie.type.toUpperCase()} ${subserie.number}`).join(', ')}, `
    }

    doi = formatIdentifiers(rfc.identifiers, ' ').join(' ')

    return `${formatAuthorsPerStyleGuide(rfc.authors, 'brief')}, "${rfc.title}", ${subseries}RFC ${rfc.number}, ${doi},${
      rfcdate ? ` ${rfcdate},` : ''
    } <${PUBLIC_SITE_URL_ORIGIN}/info/rfc${rfc.number}/>.`
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
