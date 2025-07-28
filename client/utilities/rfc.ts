import { DateTime } from 'luxon'
import { NONBREAKING_SPACE } from './strings'
import type { RfcEditorToc } from './tableOfContents'

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

type RfcCommonSubserie = { name: string; acronym: RfcCommonSubseriesType }

export type RfcCommonSubseriesType = 'bcp' | 'fyi' | 'std'

export type RfcCommonStatus =
  | 'Best Current Practice'
  | 'Experimental'
  | 'Historic'
  | 'Informational'
  | 'Not Issued'
  | 'Internet Standard'
  | 'Unknown'
  | 'Proposed Standard'
  | 'Draft Standard'

export type RfcCommon = {
  number: number
  title: string
  published: string
  area?: {
    acronym: string
    name: string
  }
  status: RfcCommonStatus
  subseries?: {
    type: RfcCommonSubseriesType
    number?: number
    subseriesLength?: number
  }
  pages?: number | null
  authors: {
    person?: number // generally should be present except when parsed from HTML
    name: string
    email?: string
    affiliation?: string
    country?: string
  }[]
  group: {
    acronym: string
    name: string
  }
  stream: {
    slug: string
    name: string
    desc?: string
  }
  identifiers?: {
    type: 'doi' | 'issn'
    value: string
  }[]
  obsoletes?: {
    id: number
    number: number
    title: string
  }[]
  obsoleted_by?: {
    id: number
    number: number
    title: string
  }[]
  updates?: {
    id: number
    number: number
    title: string
  }[]
  updated_by?: {
    id: number
    number: number
    title: string
  }[]
  is_also?: string[]
  see_also?: string[]
  draft?: {
    id?: number
    name: string
    title: string
  }
  abstract?: string
  formats: ('xml' | 'txt' | 'html' | 'htmlized' | 'pdf' | 'ps')[]
  keywords?: string[]
  errata?: string[]
  text: string | null
}

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

type RFCId = {
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
    return {
      type: parts[0].toUpperCase(),
      number: parseInt(parts[1], 10).toString()
    }
  }

  if (parts?.length === 3) {
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

export const getRfcPillText = (
  rfc: RfcCommon,
  showTagDate: boolean = true
): string[] => {
  const tagText = []
  if (rfc.status) {
    tagText.push(rfc.status)
  }
  const datetime = DateTime.fromISO(rfc.published)
  const relativeCalendar = datetime.toRelativeCalendar()
  if (showTagDate && relativeCalendar) {
    tagText.push(relativeCalendar)
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

export type RfcBucketHtmlDocument = {
  rfc: RfcCommon
  tableOfContents?: RfcEditorToc
  documentHtml: string
  documentHtmlType: 'plaintext' | 'xml2rfc'
  maxPreformattedLineLength: number
}
