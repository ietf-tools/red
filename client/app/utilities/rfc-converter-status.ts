import type { RfcCommon } from './rfc-validators.ts'

export const parseRfcStatusSlug = (
  rfcStatusSlug?: string
): RfcCommon['status'] => {
  const normalisedSlug = rfcStatusSlug?.toLowerCase().replace(/[^a-z]/g, '')

  switch (normalisedSlug) {
    case 'bestcurrentpractice':
    case 'bcp':
      return 'Best Current Practice'

    case 'experimental':
      return 'Experimental'

    case 'his':
    case 'historic':
      return 'Historic'

    case 'fyi':
    case 'informational':
      return 'Informational'

    case 'notissued':
      return 'Not Issued'

    case 'internetstandard':
    case 'standard':
    case 'standardstrack':
    case 'std':
      return 'Internet Standard'

    case 'unknown':
      return 'Unknown'

    case 'proposedstandard':
    case 'proposed':
      return 'Proposed Standard'

    case 'draftstandard':
    case 'draft':
      return 'Draft Standard'
  }
  throw Error(
    `Unable to parse status slug "${rfcStatusSlug}" (normalized as "${normalisedSlug}")`
  )
}
