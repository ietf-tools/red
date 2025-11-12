import type { z } from 'zod'
import type { RfcCommon } from './rfc'
import {
  RfcCommonStatusSchema,
  RfcCommonAreaSchema,
  RfcCommonGroupSchema
} from './rfc-validators'
import {
  isTypesenseSubseriesWithValues,
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
    console.error("Typesense parsing error", error.toString())
    throw Error(error.toString())
  }

  const parseTypeSenseSubseries = (
    item: z.infer<typeof TypeSenseSearchItemSchema>
  ): RfcCommon['subseries'] => {
    if (isTypesenseSubseriesWithValues(item.subseries)) {
      const { subseries } = item
      return [
        {
          type: subseries.acronym,
          number: subseries.number,
          subseriesLength: subseries.total
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

    const maybeRfcCommonStatusSlug =
      typesenseStatusData.slug.toLowerCase() as Lowercase<
        TypeSenseSearchItem['status']['slug']
      >

    const maybeRfcCommonStatus = {
      slug: maybeRfcCommonStatusSlug,
      name: maybeRfcCommonStatusName,
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
    streamSlug?: NonNullable<TypeSenseSearchItem['stream']>['slug']
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
  const parseTypesenseArea = (
    area: TypeSenseSearchItem['area'],
    rfcNumberForDebug?: number
  ): RfcCommon['area'] => {
    if (!area) return undefined

    const { data: parsedArea, error } = RfcCommonAreaSchema.safeParse({
      ...area,
      // FIXME: update search to include this property
      type: 'area'
    })
    if (error) {
      const fromRfcErrorSuffix =
        rfcNumberForDebug !== undefined ? ` from RFC ${rfcNumberForDebug}` : ''
      console.error(error)
      throw Error(
        `Problem parsing area type ${JSON.stringify(area)}${fromRfcErrorSuffix}`
      )
    }
    return parsedArea
  }

  const parseTypesenseGroup = (
    group: TypeSenseSearchItem['group'],
    rfcNumberForDebug?: number
  ): RfcCommon['group'] => {
    const { data: parsedGroup, error } = RfcCommonGroupSchema.safeParse({
      ...group,
      type: 'area'
    })
    if (error) {
      const fromRfcErrorSuffix =
        rfcNumberForDebug !== undefined ? ` from RFC ${rfcNumberForDebug}` : ''
      console.error(error)
      throw Error(
        `Problem parsing group type ${JSON.stringify(group)} ${fromRfcErrorSuffix}`
      )
    }
    return parsedGroup
  }

  const published = new Date(item.publicationDate * 1000).toISOString()
  const authors =
    item.authors?.map((author, index) => ({
      person: index,
      name: author.name
    })) ?? []

  return {
    abstract: item.abstract,
    area: parseTypesenseArea(item.area),
    authors,
    formats: [],
    group: parseTypesenseGroup(item.group),
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
