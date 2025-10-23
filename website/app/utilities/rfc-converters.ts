import type { z } from 'zod'
import type { RfcCommon } from './rfc'
import { RfcCommonStatusSchema } from './rfc-validators'
import {
  TypeSenseSearchItemSchema,
  TypesenseSearchItemStatusSchema
} from './typesense'
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
    status: TypeSenseSearchItem['status']
  ): RfcCommon['status'] => {
    const { slug, name } = status
    const { data: typesenseStatusData, error: typesenseStatusError } =
      TypesenseSearchItemStatusSchema.safeParse({ slug, name })
    if (typesenseStatusError) {
      throw Error(
        `Unable to parse typesense rfc status ${JSON.stringify(status)}").`
      )
    }

    const maybeRfcCommonStatusName =
      typesenseStatusData.name.toLowerCase() as Lowercase<
        TypeSenseSearchItem['status']['name']
      >

    type MaybeRfcCommonStatus = { name: string; slug: string }
    let maybeRfcCommonStatus: MaybeRfcCommonStatus = {
      name: maybeRfcCommonStatusName,
      slug: typesenseStatusData.slug
    }
    if (
      typesenseStatusData.slug === 'ps' &&
      typesenseStatusData.name === 'Proposed Standard'
    ) {
      maybeRfcCommonStatus = {
        slug: 'standard',
        name: 'standards track'
      } satisfies RfcCommon['status']
    } else if (
      typesenseStatusData.slug === 'inf' &&
      typesenseStatusData.name === 'Informational'
    ) {
      maybeRfcCommonStatus = {
        slug: 'informational',
        name: 'informational'
      } satisfies RfcCommon['status']
    } else if (
      typesenseStatusData.slug === 'std' &&
      typesenseStatusData.name === 'Internet Standard'
    ) {
      maybeRfcCommonStatus = {
        slug: 'standard',
        name: 'internet standard'
      } satisfies RfcCommon['status']
    } else if (
      typesenseStatusData.slug === 'hist' &&
      typesenseStatusData.name === 'Historic'
    ) {
      maybeRfcCommonStatus = {
        slug: 'historic',
        name: 'historic'
      } satisfies RfcCommon['status']
    } else if (
      typesenseStatusData.slug === 'exp' &&
      typesenseStatusData.name === 'Experimental'
    ) {
      maybeRfcCommonStatus = {
        slug: 'experimental',
        name: 'experimental'
      } satisfies RfcCommon['status']
    } else if (
      typesenseStatusData.slug === 'unkn' &&
      typesenseStatusData.name === 'Unknown'
    ) {
      maybeRfcCommonStatus = {
        slug: 'unknown',
        name: 'unknown'
      } satisfies RfcCommon['status']
    } else if (
      typesenseStatusData.slug === 'ds' &&
      typesenseStatusData.name === 'Draft Standard'
    ) {
      maybeRfcCommonStatus = {
        slug: 'ds',
        name: 'draft standard'
      } satisfies RfcCommon['status']
    }

    const { data: rfcCommonStatusData, error: rfcCommonStatusError } =
      RfcCommonStatusSchema.safeParse(maybeRfcCommonStatus)
    if (rfcCommonStatusError) {
      throw Error(
        `Unable to parse rfc common status from input ${JSON.stringify(maybeRfcCommonStatus)}. Was originally typesense input ${JSON.stringify(status)}`
      )
    }
    return rfcCommonStatusData
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
