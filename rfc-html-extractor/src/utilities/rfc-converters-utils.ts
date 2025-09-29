import { assertNever } from './typescript.ts'
import type { RfcCommon } from '../../../client/app/utilities/rfc-validators.ts'

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
            index === arr.length - 1
              ? ` ${item}`
              : `${item.substring(0, 1).toUpperCase()}.`
          return `${acc}${newBit}`
        case 'brief':
          newBit =
            index === arr.length - 1
              ? `${item}, `
              : `${item.substring(0, 1).toUpperCase()}.`
          return `${newBit}${acc}`
        case 'reverse':
          newBit =
            index === arr.length - 1
              ? `${item}, `
              : `${item.substring(0, 1).toUpperCase()}.`
          return `${newBit}${acc}`
      }
      assertNever(style)
    }, '')

  return author.affiliation === 'Editor' ? `${name}, Ed.` : name
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