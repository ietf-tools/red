import type { z } from 'zod'
import { DateTime } from 'luxon'
import type {
  RfcBucketHtmlDocumentSchema,
  RfcCommonSchema,
  RfcCommonStatusSchema,
  RfcCommonSubseriesTypeSchema
} from './rfc-validators'
import { startCase } from 'lodash-es'

export const RFC_TYPE_RFC = 'rfc' as const

export type RfcCommon = z.infer<typeof RfcCommonSchema>

export type RfcCommonSubseriesType = z.infer<
  typeof RfcCommonSubseriesTypeSchema
>

export type SeriesType = 'rfc' | RfcCommonSubseriesType

export type RfcCommonStatus = z.infer<typeof RfcCommonStatusSchema>

export type SeriesId = {
  type: SeriesType
  number: number
}

/**
 * Parses a string like 'RFC100' or 'bcp4' into its constituent parts
 */
export const parseSeriesId = (maybeSeriesId: string): SeriesId | undefined => {
  // split by groups of letters or numbers
  // ie "RFC0000" becomes ["RFC", "0000"]
  const parts = maybeSeriesId
    .replace(
      // remove whitespace including non-breaking-space
      /\s/g,
      ''
    )
    .match(/\d+|\D+/g)

  if (parts && parts.length >= 2) {
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

export const isAprilFoolsRfc = (rfc: RfcCommon): boolean => {
  if (rfc.published === undefined) return false
  const datetime = DateTime.fromISO(rfc.published)
  return (
    rfc.stream.slug === 'INDEPENDENT' &&
    datetime.month === 4 &&
    datetime.day === 1 &&
    rfc.group?.acronym === 'none'
  )
}
