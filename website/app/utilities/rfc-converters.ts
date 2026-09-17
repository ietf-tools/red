import type { z } from 'zod'
import type { FullDocumentMetadata } from '../../generated/reef-api-zod'
import { RFC_TYPE_RFC, parseSeriesId, type RfcCommon } from './rfc'
import {
  RfcCommonStatusSchema,
  RfcCommonStreamSlugSchema,
  RfcCommonAreaSchema,
  RfcCommonGroupSchema,
  RfcCommonIdentifierSchema,
  type RfcCommonAuthor
} from './rfc-validators'
import { isTypesenseSubseriesWithValues, TypeSenseSearchItemSchema, TypesenseSearchItemStatusSchema } from './typesense'
import type { TypeSenseSearchItem } from './typesense'
import { logOnce } from './log'

export const typeSenseSearchItemToRFCCommon = (unverifiedTypeSenseSearchItem: TypeSenseSearchItem): RfcCommon => {
  const { data: item, error } = TypeSenseSearchItemSchema.safeParse(unverifiedTypeSenseSearchItem)
  if (error) {
    console.error('Typesense parsing error', error.toString())
    throw Error(error.toString())
  }

  const parseTypeSenseSubseries = (item: z.infer<typeof TypeSenseSearchItemSchema>): RfcCommon['subseries'] => {
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

  const parseTypesenseStatus = (status: TypeSenseSearchItem['status']): RfcCommon['status'] => {
    const { slug, name } = status
    const { data: typesenseStatusData, error: typesenseStatusError } = TypesenseSearchItemStatusSchema.safeParse({
      slug,
      name
    })
    if (typesenseStatusError) {
      throw Error(`Unable to parse typesense rfc status ${JSON.stringify(status)}").`)
    }

    const maybeRfcCommonStatusName = typesenseStatusData.name.toLowerCase() as Lowercase<
      TypeSenseSearchItem['status']['name']
    >

    const maybeRfcCommonStatusSlug = typesenseStatusData.slug.toLowerCase() as Lowercase<
      TypeSenseSearchItem['status']['slug']
    >

    const maybeRfcCommonStatus = {
      slug: maybeRfcCommonStatusSlug,
      name: maybeRfcCommonStatusName
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
  const parseTypesenseArea = (area: TypeSenseSearchItem['area'], rfcNumberForDebug?: number): RfcCommon['area'] => {
    if (!area) return undefined
    const { data: parsedArea, error } = RfcCommonAreaSchema.safeParse(area satisfies RfcCommon['area'])
    if (error) {
      const fromRfcErrorSuffix = rfcNumberForDebug !== undefined ? ` from RFC ${rfcNumberForDebug}` : ''
      console.error(error)
      throw Error(`Problem parsing area type ${JSON.stringify(area)}${fromRfcErrorSuffix}`)
    }
    return parsedArea
  }

  const parseTypesenseGroup = (group: TypeSenseSearchItem['group'], rfcNumberForDebug?: number): RfcCommon['group'] => {
    logOnce(
      `[Typesense] API data currently doesn't have Group 'type' so search results will use default Group type of 'area' in search results.`
    )
    const { data: parsedGroup, error } = RfcCommonGroupSchema.safeParse({
      ...group,
      type: 'area'
    } satisfies RfcCommon['group'])
    if (error) {
      const fromRfcErrorSuffix = rfcNumberForDebug !== undefined ? ` from RFC ${rfcNumberForDebug}` : ''
      console.error(error)
      throw Error(`Problem parsing group type ${JSON.stringify(group)} ${fromRfcErrorSuffix}`)
    }
    return parsedGroup
  }

  const published: RfcCommon['published'] = new Date(item.publicationDate * 1000).toISOString()
  const authors: RfcCommonAuthor[] =
    item.authors?.map((author, index) => ({
      person: index,
      titlepage_name: author.name
    })) ?? []

  return {
    abstract: item.abstract,
    area: parseTypesenseArea(item.area),
    authors,
    formats: [],
    group: parseTypesenseGroup(item.group),
    number: item.rfcNumber,
    obsoleted_by:
      item.obsoletedBy?.map((obs) => ({
        id: parseInt(obs, 10),
        number: parseInt(obs, 10),
        title: obs
      })) ?? [],
    published,
    // Validated by TypeSenseSearchItemSchema above, so it is carried across as it came.
    reefStats: item.reefStats,
    subseries: item.status?.name ? parseTypeSenseSubseries(item) : undefined,
    status: parseTypesenseStatus(item.status),
    stream: {
      slug: parseTypesenseStreamSlug(item.stream?.slug),
      name: item.stream?.name || 'unknown'
    },
    text: '',
    title: item.title
  } satisfies RfcCommon
}

/**
 * One entry from a precomputed subject file's `document_meta`, as an `RfcCommon` an `RFCCard`
 * can render.
 *
 * `undefined` for `title: null` — Red's index has not resolved this identifier yet, which
 * `document_meta` states as a real, distinct answer rather than an error, so the caller falls
 * back to a plain link the same way it already does for a document with no `document_meta` entry
 * at all. Everything else Reef sends is trusted to match the contract, so a status or stream
 * outside what `RfcCommon` recognises throws instead of rendering a card that says the wrong
 * thing.
 *
 * `document_meta` carries no cross-referenced document's title — only this subject's own
 * assignments are resolved — so `obsoletes`, `obsoleted_by`, `updates`, and `updated_by` stand in
 * their number as a placeholder title, same as `typeSenseSearchItemToRFCCommon` does for the same
 * gap.
 */
export const documentMetaToRfcCommon = (doc: string, meta: FullDocumentMetadata): RfcCommon | undefined => {
  if (meta.title === null || meta.status === null || meta.stream === null) return undefined

  const seriesId = parseSeriesId(doc)
  if (seriesId?.type !== RFC_TYPE_RFC) {
    throw new Error(`documentMetaToRfcCommon: "${doc}" is not an RFC identifier`)
  }

  const parseStatus = (status: string, statusName: string | null): RfcCommon['status'] => {
    const { data, error } = RfcCommonStatusSchema.safeParse({ slug: status, name: statusName })
    if (error) {
      throw new Error(
        `Unable to parse rfc status from document_meta for ${doc}: ${JSON.stringify({ slug: status, name: statusName })}`
      )
    }
    return data
  }

  const parseStream = (stream: string, streamName: string | null): RfcCommon['stream'] => {
    const { data: slug, error } = RfcCommonStreamSlugSchema.safeParse(stream)
    if (error) {
      throw new Error(`Unable to parse rfc stream from document_meta for ${doc}: ${JSON.stringify(stream)}`)
    }
    return { slug, name: streamName ?? slug }
  }

  const parseArea = (area: FullDocumentMetadata['area']): RfcCommon['area'] => {
    if (area === null) return undefined
    const { data, error } = RfcCommonAreaSchema.safeParse(area)
    if (error) {
      throw new Error(`Unable to parse rfc area from document_meta for ${doc}: ${JSON.stringify(area)}`)
    }
    return data
  }

  const parseGroup = (group: FullDocumentMetadata['group']): RfcCommon['group'] => {
    if (group === null) return undefined
    // Reef's group carries no `type` — see the same gap and the same default in
    // typeSenseSearchItemToRFCCommon's parseTypesenseGroup above.
    logOnce(`[reef] document_meta groups have no "type", defaulting to "area" in subject pages.`)
    const { data, error } = RfcCommonGroupSchema.safeParse({ ...group, type: 'area' } satisfies RfcCommon['group'])
    if (error) {
      throw new Error(`Unable to parse rfc group from document_meta for ${doc}: ${JSON.stringify(group)}`)
    }
    return data
  }

  const parseIdentifiers = (identifiers: FullDocumentMetadata['identifiers']): RfcCommon['identifiers'] => {
    const { data, error } = RfcCommonIdentifierSchema.array().safeParse(identifiers)
    if (error) {
      throw new Error(`Unable to parse rfc identifiers from document_meta for ${doc}: ${JSON.stringify(identifiers)}`)
    }
    return data
  }

  const parseSubseries = (subseries: string[]): RfcCommon['subseries'] =>
    subseries.map((entry) => {
      const parsed = parseSeriesId(entry)
      if (parsed === undefined || parsed.type === RFC_TYPE_RFC) {
        throw new Error(`Unable to parse subseries identifier "${entry}" from document_meta for ${doc}`)
      }
      return { type: parsed.type, number: parsed.number }
    })

  // A placeholder rather than a lookup: the referenced document may not be assigned to this
  // subject, so its title isn't anywhere in this file to read.
  const placeholderRef = (number: number): { id: number; number: number; title: string } => ({
    id: number,
    number,
    title: String(number)
  })

  return {
    number: seriesId.number,
    title: meta.title,
    published: meta.published ?? undefined,
    area: parseArea(meta.area),
    pages: meta.pages ?? undefined,
    status: parseStatus(meta.status, meta.status_name),
    subseries: parseSubseries(meta.subseries),
    authors: meta.authors.map((name): RfcCommonAuthor => ({ titlepage_name: name })),
    group: parseGroup(meta.group),
    stream: parseStream(meta.stream, meta.stream_name),
    identifiers: parseIdentifiers(meta.identifiers),
    obsoletes: meta.obsoletes.map(placeholderRef),
    obsoleted_by: meta.obsoleted_by.map(placeholderRef),
    updates: meta.updates.map(placeholderRef),
    updated_by: meta.updated_by.map(placeholderRef),
    keywords: meta.keywords,
    formats: [],
    abstract: meta.abstract ?? undefined,
    text: ''
  } satisfies RfcCommon
}
