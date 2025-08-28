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

export type RfcCommon = z.infer<typeof RfcCommonSchema>

type RfcCommonSubserie = { name: string; acronym: RfcCommonSubseriesType }

export type RfcCommonSubseriesType = z.infer<
  typeof RfcCommonSubseriesTypeSchema
>

export type RfcCommonStatus = z.infer<typeof RfcCommonStatusSchema>

export const blankRfcCommon: RfcCommon = {
  number: 0,
  title: '',
  published: '1950-1-1',
  pages: 0,
  status: 'Unknown',
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
    slug: '',
    name: '',
    desc: ''
  },
  identifiers: [],
  obsoleted_by: [],
  updated_by: [],
  formats: [],
  abstract: '',
  text: ''
}

export type RFCId = {
  type: string | typeof RFC_TYPE_RFC
  number: string
  title?: string
}

export const RFC_TYPE_RFC = 'RFC'

export const parseRFCId = (title: string): RFCId => {
  // split by groups of letters or numbers
  // ie "RFC0000" becomes ["RFC", "0000"]
  // or "RFC0000BUB" becomes ["RFC", "0000", "BUB"]
  const parts = title
    .replace(
      // remove whitespace including non-breaking-space
      /\s/g,
      ''
    )
    .match(/\d+|\D+/g)

  if (parts?.length === 2) {
    if (typeof parts[1] !== 'string') {
      throw Error(`Failed to parse RFC. Was ${typeof parts[1]}`)
    }
    return {
      type: parts[0].toUpperCase(),
      number: parseInt(parts[1], 10).toString()
    }
  }

  if (parts?.length === 3) {
    if (typeof parts[1] !== 'string') {
      throw Error(`Failed to parse RFC. Was ${typeof parts[1]}`)
    }
    return {
      type: parts[0].toUpperCase(),
      number: parseInt(parts[1], 10).toString(),
      title: parts[2]
    }
  }

  return {
    type: 'unknown',
    number: title
  }
}

export const getRfcPillText = (rfc: RfcCommon): string[] => {
  const tagText = []
  if (rfc.status) {
    tagText.push(rfc.status)
  }
  return tagText
}

/**
 * Formats a string of 'RFCnumber' with non-bold/bold text with an NBSP between
 * Returns h() Component for rendering
 */
export const formatTitleAsVNode = (rfcId: string): VNode => {
  const parts = parseRFCId(rfcId)

  return h('span', [
    h('span', { class: 'font-normal' }, parts.type),
    NONBREAKING_SPACE,
    h('span', { class: 'font-bold' }, parts.number)
  ])
}

export type RFCJSON = {
  draft: string
  doc_id: string
  title: string
  authors: string[]
  format: string[]
  page_count: string
  pub_status: string
  status: string
  source: string
  abstract?: string
  pub_date: string
  keywords: string[]
  obsoletes: string[]
  obsoleted_by: string[]
  updates: string[]
  updated_by: string[]
  see_also: string[]
  doi: string | null
  errata_url: string | null
}

export type RfcBucketHtmlDocument = z.infer<typeof RfcBucketHtmlDocumentSchema>

export const isAprilFoolsRfc = (rfc: RfcCommon): boolean => {
  const datetime = DateTime.fromISO(rfc.published)
  return (
    datetime.month === 4 && datetime.day === 1 && rfc.group.acronym === 'none'
  )
}
