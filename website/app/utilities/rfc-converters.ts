import type { z } from 'zod'
import type { RfcCommon } from './rfc'
import { TypeSenseSearchItemSchema, TypesenseSearchItemStatusSchema } from './typesense'
import type { TypeSenseSearchItem } from './typesense'

export const typeSenseSearchItemToRFCCommon = (
  unverifiedTypeSenseSearchItem: TypeSenseSearchItem
): RfcCommon => {
  const { data: item, error } = TypeSenseSearchItemSchema.safeParse(
    unverifiedTypeSenseSearchItem
  )
  if (error) {
    console.error(error.toString())
    throw Error(error.toString())
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

  const parseTypesenseStatus = (
  status: TypeSenseSearchItem["status"]
): RfcCommon['status'] => {
  const { data, error } = TypesenseSearchItemStatusSchema.safeParse(status)
  if (error) {
    throw Error(`Unable to parse RFC status ${JSON.stringify(status)}").`)
  }
  return data
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
    status: parseTypesenseStatus(item.status),
    stream: {
      slug: parseTypesenseStreamSlug(item.stream?.slug),
      name: item.stream?.name || 'unknown'
    },
    text: '',
    title: item.title
  }
}
