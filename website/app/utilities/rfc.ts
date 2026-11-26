import type { z } from 'zod'
import { DateTime } from 'luxon'
import type {
  RfcBucketHtmlDocumentSchema,
  RfcCommonSchema,
  RfcCommonStatusSchema,
  RfcCommonSubseriesTypeSchema
} from './rfc-validators'
import { startCase } from 'es-toolkit'

export const RFC_TYPE_RFC = 'rfc' as const

export type RfcCommon = z.infer<typeof RfcCommonSchema>

export type RfcCommonSubseriesType = z.infer<typeof RfcCommonSubseriesTypeSchema>

export type SeriesType = 'rfc' | RfcCommonSubseriesType

export type RfcCommonStatus = z.infer<typeof RfcCommonStatusSchema>

export type SeriesId = {
  type: SeriesType
  number: number
}

/**
 * Parses a string like 'RFC100' or 'bcp4' into its 2 constituent parts.
 *
 * It attempts to be strict in its parsing, not lenient. We want to be able
 * to parse series ids in urls (eg the 'rfc9000' in /info/rfc9000) so we want
 * don't want a lenient parser that would make accept 'rfc9000<script>'
 * or any other bizarro series id syntax.
 */
export const parseSeriesId = (maybeSeriesId: string): SeriesId | undefined => {
  const parts = maybeSeriesId
    // split by groups of contiguous letters or numbers
    // ie "RFC0000" becomes ["RFC", "0000"]
    .match(/\d+|\D+/g)

  if (parts && parts.length === 2) {
    const [partType, partNumber] = parts
    if (partNumber === undefined) {
      return undefined
    }

    const number = parseInt(partNumber, 10)

    if (Number.isNaN(number)) {
      // unable to parse number
      console.warn('Unable to parse number in seriesId', {
        maybeSeriesId,
        partNumber
      })
      return undefined
    }

    const partTypeLowerCase = partType.toLowerCase()

    switch (partTypeLowerCase) {
      case 'rfc':
      case 'bcp':
      case 'fyi':
      case 'std':
        return {
          type: partTypeLowerCase,
          number
        }
    }
  }

  return undefined
}

export const getRfcPillText = (rfc: RfcCommon): string[] => {
  const tagText: string[] = []
  if (rfc.status) {
    tagText.push(startCase(rfc.status.name))
  }
  return tagText
}

export type RfcBucketHtmlDocument = z.infer<typeof RfcBucketHtmlDocumentSchema>

// The datatracker gives a document with no group the placeholder group 'none', which has no pages of its own
export const realGroup = (group: RfcCommon['group']): RfcCommon['group'] =>
  group?.acronym === 'none' ? undefined : group

export const isAreaSponsored = (rfc: Pick<RfcCommon, 'stream' | 'group'>): boolean => {
  const { stream, group } = rfc
  if (stream.slug !== 'IETF') return false
  const real = realGroup(group)
  return !real || real.type === 'area'
}

// The datatracker is inconsistent about whether an area's name already ends in "Area"
export const areaLabel = (area: NonNullable<RfcCommon['area']>): string =>
  /\barea$/i.test(area.name) ? area.name : `${area.name} Area`

export const isAprilFoolsRfc = (rfc: Pick<RfcCommon, 'published' | 'stream' | 'group'>): boolean => {
  if (rfc.published === undefined) return false
  const datetime = DateTime.fromISO(rfc.published)
  return (
    rfc.stream.slug === 'INDEPENDENT' && datetime.month === 4 && datetime.day === 1 && rfc.group?.acronym === 'none'
  )
}

export const ISSN = '2070-1721' as const
