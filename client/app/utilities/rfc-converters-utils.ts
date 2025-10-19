import type { DateTime } from 'luxon'
import { parseSeriesId } from './rfc'
import type { RfcCommon } from './rfc'
import { NONBREAKING_SPACE } from './strings'
import { assertNever } from './typescript'
import type { RfcEditorToc } from './tableOfContents'

type RfcAuthor = RfcCommon['authors'][number]

/**
 * Formats author names into an initialised format.
 *
 * eg.
 * author.name:
 * * "First Name" becomes "F. Name"
 * * "First Second Name" becomes "F.S. Name"
 * ...and if they're an editor they get an "Ed." suffix
 *
 */
export const formatAuthor = (
  author: RfcAuthor,
  style: 'regular' | 'brief' | 'reverse'
): string => {
  const name = author.name
    .split(/[\s.]/g)
    .filter(Boolean)
    .filter((_part, index, arr) => {
      if (style === 'regular') {
        return true
      }
      // otherwise discard middlenames
      const isStart = index === 0
      const isEnd = index === arr.length - 1
      return isStart || isEnd
    })
    .reduce((acc, item, index, arr) => {
      let newBit = ''
      switch (style) {
        case 'regular':
          newBit =
            index === arr.length - 1 ?
              ` ${item}`
            : `${item.substring(0, 1).toUpperCase()}.`
          return `${acc}${newBit}`
        case 'brief':
          newBit =
            index === arr.length - 1 ?
              `${item}, `
            : `${item.substring(0, 1).toUpperCase()}.`
          return `${newBit}${acc}`
        case 'reverse':
          newBit =
            index === arr.length - 1 ?
              `${item}, `
            : `${item.substring(0, 1).toUpperCase()}.`
          return `${newBit}${acc}`
      }
      assertNever(style)
    }, '')

  return author.affiliation === 'Editor' ? `${name}, Ed.` : name
}

type UppercaseFormats = Uppercase<RfcCommon['formats'][number]> | 'ASCII'

export const formatFormat = (
  format: string,
  isPreV3: boolean // we need to know whether it's pre-V3 https://www.rfc-editor.org/rpc/wiki/doku.php?id=rfc_metadata_in_the_v3_era
): UppercaseFormats => {
  switch (format) {
    case 'txt':
      return isPreV3 ? 'ASCII' : 'TXT'
    case 'xml':
      return 'XML'
    case 'html':
      return 'HTML'
    case 'htmlized':
      return 'HTMLIZED'
    case 'pdf':
      return 'PDF'
    case 'ps':
      return 'PS'
  }
  throw Error(`Unexpected format "${format}"`)
}

export const formatDatePublished = (
  dt: DateTime,
  isAprilFirstMode: boolean
): string => {
  if (isAprilFirstMode && dt.month === 4 && dt.day === 1) {
    // handle April 1st
    return dt.toFormat('d LLLL yyyy')
  }
  return dt.toFormat('LLLL yyyy')
}

export const parseRfcFormat = (
  format: string
): RfcCommon['formats'][number] => {
  switch (format.toLowerCase()) {
    case 'xml':
      return 'xml'
    case 'ascii':
      return 'txt'
    case 'txt':
      return 'txt'
    case 'html':
      return 'html'
    case 'htmlized':
      return 'htmlized'
    case 'pdf':
      return 'pdf'
    case 'ps':
      return 'ps'
  }
  throw Error(`Unable to parse RFC format "${format}"`)
}

/**
 * Formats a string of 'RFCnumber' as plain text with an NBSP between
 */
export const formatTitlePlaintext = (title: string): string => {
  const parts = parseSeriesId(title)
  if (!parts) return ''
  return `${parts.type}${NONBREAKING_SPACE}${parts.number}`
}

export const formatIdentifiers = (
  identifiers: RfcCommon['identifiers'],
  separator: string = ': '
): string[] => {
  if (!identifiers || identifiers.length === 0) return []
  return identifiers.map(
    (identifier) =>
      `${identifier.type.toUpperCase()}${separator}${identifier.value}`
  )
}

type TocSection = RfcEditorToc['sections'][number]
export const isTocSection = (
  maybeTocSection?: unknown
): maybeTocSection is TocSection => {
  return Boolean(
    maybeTocSection &&
      typeof maybeTocSection === 'object' &&
      'links' in maybeTocSection
  )
}
