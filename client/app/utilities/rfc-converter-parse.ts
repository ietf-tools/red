import type { RfcCommon } from './rfc-validators.ts'

export const parseRfcStatusSlug = (
  rfcStatusSlug?: string
): RfcCommon['status'] => {
  const normalisedSlug = rfcStatusSlug?.toLowerCase().replace(/[^a-z]/g, '')

  let slug: RfcCommon['status']['slug'] | undefined
  let name: RfcCommon['status']['name'] | undefined

  switch (normalisedSlug) {
    case 'bestcurrentpractice':
    case 'bcp':
      slug = 'bcp'
      name = 'Best Current Practice'
      break

    case 'experimental':
      slug = 'experimental'
      name = 'Experimental'
      break

    case 'his':
    case 'historic':
      slug = 'his'
      name = 'Historic'
      break

    case 'fyi':
    case 'informational':
      slug = 'fyi'
      name = 'Informational'
      break

    case 'notissued':
      slug = 'not-issued'
      name = 'Not Issued'
      break

    case 'internetstandard':
    case 'standard':
    case 'standardstrack':
    case 'std':
      slug = 'standard'
      name = 'Internet Standard'
      break

    case 'unknown':
      slug = 'unknown'
      name = 'Unknown'
      break

    case 'proposedstandard':
    case 'proposed':
      slug = 'proposed'
      name = 'Proposed Standard'
      break

    case 'draftstandard':
    case 'draft':
      slug = 'draft'
      name = 'Draft Standard'
      break
  }

  if (!slug || !name) {
    throw Error(
      `Unable to parse status slug "${rfcStatusSlug}" (normalized as "${normalisedSlug}"). ${JSON.stringify({ name, typeofName: typeof name, slug, typeofSlug: typeof slug })}`
    )
  }

  return {
    slug,
    name
  }
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
    case 'independent':
      return 'INDEPENDENT'
    case 'editorial':
      return 'Editorial'
    case 'legacy':
      return 'Legacy'
  }
  throw Error(`Unable to parse stream slug "${streamSlug}"`)
}
