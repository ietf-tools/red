import { assertNever } from './typescript.ts'
import type { RfcCommon } from '../../../website/app/utilities/rfc-validators.ts'
import { DateTime } from 'luxon'

type RfcAuthor = RfcCommon['authors'][number]

export const EDITOR_SUFFIX = ', Ed.'

/**
 * No longer done, but some early RFCs had authors as organisations not individuals.
 */
const organisationsAsUsers = [
  'Information Sciences Institute University of Southern California', // RFC 212
  'International Telegraph and Telephone Consultative Committee of the International Telecommunication Union', // RFC 804
  'National Bureau of Standards', // RFC 806, RFC 841
  'International Organization for Standardization', // RFC 892, RFC 926, RFC 941, RFC 994, RFC 995
  'ISO', // RFC 905
  'Bolt Beranek and Newman Laboratories', // RFC 907
  'National Research Council', // RFC 939, RFC 942
  'Gateway Algorithms and Data Structures Task Force', // RFC 940
  'National Science Foundation', // RFC 985
  'Network Technical Advisory Group', // RFC 985
  'NetBIOS Working Group in the Defense Advanced Research Projects Agency', // RFC 1001, RFC 1002
  'Internet Activities Board', // RFC 1001, RFC 1002, RFC 1083, RFC 1087, RFC 1100, RFC 1130, RFC 1140, RFC 1200
  'End-to-End Services Task Force', // RFC 1001, RFC 1002
  'Sun Microsystems', // RFC 1014, RFC 1050, RFC 1057, RFC 2339
  'Defense Advanced Research Projects Agency', // RFC 1087, RFC 1100, RFC 1130, RFC 1140, RFC 1200
  'North American Directory Forum', // RFC 1218
  'The North American Directory Forum', // RFC 1255, RFC 1295, RFC 1417, RFC 1758
  'ESCC X.500/X.400 Task Force', // RFC 1330
  'Energy Sciences Network (ESnet)', // RFC 1330
  'ESnet Site Coordinating Comittee (ESCC)', // RFC 1330 (note: typo "Comittee" is in the source data)
  'ACM SIGUCCS', // RFC 1359
  'Internet Architecture Board', // RFC 1370, RFC 1401, RFC 1602, RFC 2826, RFC 2850, RFC 3677, RFC 3869, RFC 4052, RFC 4844, RFC 4845, RFC 6220
  'Vietnamese Standardization Working Group', // RFC 1456
  'Internet Engineering Steering Group', // RFC 1517, RFC 1602
  'EARN Staff', // RFC 1580
  'RARE WG-MSG Task Force 88', // RFC 1616
  'IETF Secretariat', // RFC 1718
  'Internet Assigned Numbers Authority (IANA)', // RFC 1797
  'Federal Networking Council', // RFC 1811, RFC 1816, RFC 2146
  'IAB', // RFC 1881, RFC 1984, RFC 2804, RFC 2825, RFC 3177, RFC 3245, RFC 3424, RFC 3639, RFC 3724, RFC 4101, RFC 4367, RFC 4440, RFC 4690, RFC 4732, RFC 5507, RFC 5620, RFC 5694, RFC 5704, RFC 5741, RFC 5745, RFC 6548, RFC 6635
  'IESG', // RFC 1881, RFC 1984, RFC 2804, RFC 3177
  'Audio-Video Transport Working Group', // RFC 1889, RFC 1890
  'ISOC Board of Trustees', // RFC 2134, RFC 2135
  'KOI8-U Working Group', // RFC 2319
  'The Internet Society', // RFC 2339
  'IANA', // RFC 3330
  'IAB Advisory Committee', // RFC 3716
  'IAB and IESG', // RFC 4089
  'RFC Editor', // RFC 5000, RFC 5540
]

export type FormatAuthorStyle = 'regular' | 'brief' | 'reverse'

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
  style: FormatAuthorStyle
): string => {
  const { titlepage_name } = author
  if (!titlepage_name) return ''

  if (organisationsAsUsers.includes(titlepage_name)) {
    return titlepage_name
  }

  const name = titlepage_name
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

  return author.is_editor ? `${name}${EDITOR_SUFFIX}` : name
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

type FormatNames = RfcCommon['formats'][number]["format"]
type UppercaseFormats = Uppercase<FormatNames> | 'ASCII'

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
    case 'htmlized':
      return 'HTML'
    case 'pdf':
      return 'PDF'
    case 'ps':
      return 'PS'
    case 'json':
      return 'JSON'
    case 'notprepped':
      return 'NOTPREPPED'

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
