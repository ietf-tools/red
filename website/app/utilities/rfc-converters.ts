import type { z } from 'zod'
import type { RfcCommon } from './rfc'
import { TypeSenseSearchItemSchema } from './typesense'
import type { TypeSenseSearchItem } from './typesense'

export const typeSenseSearchItemToRFCCommon = (
  unverifiedTypeSenseSearchItem: TypeSenseSearchItem
): RfcCommon => {
  const result = TypeSenseSearchItemSchema.safeParse(
    unverifiedTypeSenseSearchItem
  )
  if (result.error) {
    console.error(result.error.toString())
    throw Error(result.error.toString())
  }

  const parseTypeSenseSubseries = (
    item: z.infer<typeof TypeSenseSearchItemSchema>
  ): RfcCommon['subseries'] => {
    if (item.subseries?.acronym) {
      return [
        {
          type: item.subseries?.acronym,
          number: item.subseries?.number,
          subseriesLength: item.subseries?.total
        }
      ]
    }
    return undefined
  }

  const parseTypesenseStatusSlug = (
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

      case 'fyi':
        return {
          slug: 'fyi',
          name: 'FYI'
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

      case 'informational':
        return {
          slug: 'informational',
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

      case 'ps':
      case 'proposedstandard':
      case 'proposed':
        return {
          slug: 'ps',
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

  const parseTypesenseStreamSlug = (
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

  const item = result.data

  const published = new Date(item.publicationDate * 1000).toISOString()
  const authors =
    item.authors?.map((author, index) => ({
      person: index,
      name: author.name
    })) ?? []

  return {
    abstract: item.abstract,
    area:
      item.area ?
        {
          name: item.area.name,
          acronym: item.area.acronym
        }
      : undefined,
    authors,
    formats: [],
    group: {
      acronym: item.group.acronym,
      name: item.group.name
    },
    number: item.rfcNumber,
    published,
    subseries: item.status?.name ? parseTypeSenseSubseries(item) : undefined,
    status: parseTypesenseStatusSlug(item.status?.name),
    stream: {
      slug: parseTypesenseStreamSlug(item.stream?.slug),
      name: item.stream?.name || 'unknown'
    },
    text: '',
    title: item.title
  }
}
