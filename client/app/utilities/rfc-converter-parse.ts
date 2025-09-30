import type { RfcCommon } from './rfc-validators.ts'

export const parseRfcStatusSlug = (
  rfcStatusSlug?: string
): RfcCommon['status'] => {
  const normalisedSlug = rfcStatusSlug?.toLowerCase().replace(/[^a-z]/g, '')

  switch (normalisedSlug) {
    case 'bestcurrentpractice':
    case 'bcp':
      return {
        slug: 'bcp',
        name: 'Best Current Practice'
      }

    case 'experimental':
      return {
        slug: 'experimental',
        name: 'Experimental'
      }

    case 'his':
    case 'historic':
      return {
        slug: 'his',
        name: 'Historic'
      }

    case 'fyi':
    case 'informational':
      return {
        slug: 'fyi',
        name: 'Informational'
      }

    case 'notissued':
      return {
        slug: 'not-issued',
        name: 'Not Issued'
      }

    case 'internetstandard':
    case 'standard':
    case 'standardstrack':
    case 'std':
      return {
        slug: 'standard',
        name: 'Internet Standard'
      }

    case 'unknown':
      return {
        slug: 'unknown',
        name: 'Unknown'
      }

    case 'proposedstandard':
    case 'proposed':
      return {
        slug: 'proposed',
        name: 'Proposed Standard'
      }

    case 'draftstandard':
    case 'draft':
      return {
        slug: 'draft',
        name: 'Draft Standard'
      }
  }

  throw Error(
    `Unable to parse status slug "${rfcStatusSlug}" (normalized as "${normalisedSlug}").`
  )
}

export const parseRfcStreamSlug = (
  streamSlug?: string
): RfcCommon['stream']['slug'] => {
  if (!streamSlug) {
    return 'Legacy'
  }
  switch (streamSlug.toLowerCase()) {
    case 'ietf':
      return 'IETF'
    case 'iab':
      return 'IAB'
    case 'irtf':
      return 'IRTF'
    case 'ise':
    case 'independent':
      return 'INDEPENDENT'
    case 'editorial':
      return 'Editorial'
    case 'legacy':
      return 'Legacy'
  }

  throw Error(`Unable to parse stream slug "${streamSlug}"`)
}
