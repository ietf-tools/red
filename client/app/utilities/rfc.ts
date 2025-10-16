import type { z } from 'zod'
import { h } from 'vue'
import type { VNode } from 'vue'
import { DateTime } from 'luxon'
import { NONBREAKING_SPACE } from './strings'
import type {
  RfcBucketHtmlDocumentSchema,
  RfcCommonSchema,
  RfcCommonStatusSchema,
  RfcCommonSubseriesTypeSchema
} from './rfc-validators'

export const subseriesCommonType: Record<
  RfcCommonSubseriesType,
  RfcCommonSubserie
> = {
  bcp: {
    name: 'Best Current Practice',
    acronym: 'bcp'
  },
  fyi: {
    name: 'Informational',
    acronym: 'fyi'
  },
  std: {
    name: 'Internet Standard',
    acronym: 'bcp'
  }
}

export const RFC_TYPE_RFC = 'rfc' as const

export type RfcCommon = z.infer<typeof RfcCommonSchema>

type RfcCommonSubserie = { name: string; acronym: RfcCommonSubseriesType }

export type RfcCommonSubseriesType = z.infer<
  typeof RfcCommonSubseriesTypeSchema
>

export type SeriesType = 'rfc' | RfcCommonSubseriesType

export type RfcCommonStatus = z.infer<typeof RfcCommonStatusSchema>

export const blankRfcCommon: RfcCommon = {
  number: 0,
  title: '',
  pages: 0,
  status: {
    slug: 'unknown',
    name: 'Unknown'
  },
  authors: [],
  group: {
    acronym: '',
    name: ''
  },
  area: {
    acronym: '',
    name: ''
  },
  stream: {
    slug: 'Legacy',
    name: '',
    description: ''
  },
  identifiers: [],
  obsoleted_by: [],
  updated_by: [],
  formats: [],
  abstract: '',
  text: ''
}

export type SeriesId = {
  type: SeriesType
  number: string
}

/**
 * Parses a string like 'RFC100' or 'bcp4' into its constituent parts
 */
export const parseSeriesId = (maybeSeriesId: string): SeriesId | undefined => {
  // split by groups of letters or numbers
  // ie "RFC0000" becomes ["RFC", "0000"]
  // or "RFC0000BUB" becomes ["RFC", "0000", "BUB"]
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

    const number = parseInt(partNumber, 10).toString()
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
    tagText.push(rfc.status.name)
  }
  return tagText
}

/**
 * Formats a string of 'RFCnumber' with non-bold/bold text with an NBSP between
 * Returns h() Component for rendering
 */
export const formatTitleAsVNode = (rfcId: string): VNode => {
  const parts = parseSeriesId(rfcId)

  if (parts === undefined) {
    return h('span')
  }

  return h('span', [
    h('span', { class: 'font-normal' }, parts.type.toUpperCase()),
    NONBREAKING_SPACE,
    h('span', { class: 'font-bold' }, parts.number)
  ])
}

export type RfcBucketHtmlDocument = z.infer<typeof RfcBucketHtmlDocumentSchema>

export const isAprilFoolsRfc = (rfc: RfcCommon): boolean => {
  if (rfc.published === undefined) return false
  // FIXME: this should use different logic, checking for date and 'Independent Submission'
  const datetime = DateTime.fromISO(rfc.published)
  return (
    datetime.month === 4 && datetime.day === 1 && rfc.group?.acronym === 'none'
  )
}
