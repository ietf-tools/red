import { z } from 'zod'
import { DateTime } from 'luxon'
import type { SearchParamsSchema } from '../../server/api/search'
import { monthNames } from './strings'

const LegacySearchParamsSchema = z.object({
  rfc: z.string().optional(),
  title: z.string().optional(),
  'pubstatus[]': z.string().optional().or(z.array(z.string()).optional()),
  std_trk: z.string().optional(),
  pub_date_type: z.string().optional(),
  from_month: z.string().optional(),
  from_year: z.string().optional(),
  to_month: z.string().optional(),
  to_year: z.string().optional(),
  stream_name: z.string().optional(),
  area_acronym: z.string().optional()
})

export const translateParamsString = (url: string): string => {
  const legacyURLParams = new URL(url, 'https://localhost/').searchParams
  const legacyObj: Record<string, string | string[]> = {}

  for (const [key, value] of legacyURLParams.entries()) {
    if (Object.prototype.hasOwnProperty.call(legacyObj, key)) {
      const legacyObjValue = legacyObj[key]
      if (typeof legacyObjValue === 'string') {
        legacyObj[key] = [legacyObjValue]
      }
      if (!Array.isArray(legacyObj[key])) {
        throw Error(`Expected array but was ${typeof legacyObj[key]}`)
      }
      legacyObj[key].push(value)
    } else {
      legacyObj[key] = value
    }
  }

  const legacySearchParams = LegacySearchParamsSchema.safeParse(legacyObj)

  if (legacySearchParams.data) {
    const newURLParams = new URLSearchParams()
    const searchParams = translateParamsObject(legacySearchParams.data)
    // sort entries by key to result in deterministic urls
    const sortedEntries = Object.entries(searchParams).sort((a, b) =>
      a[0].localeCompare(b[0])
    )
    for (const [key, value] of sortedEntries) {
      newURLParams.append(key, value)
    }
    return newURLParams.toString()
  }

  return ''
}

export const translateParamsObject = (
  legacySearchObj: z.infer<typeof LegacySearchParamsSchema>
): z.infer<typeof SearchParamsSchema> => {
  const searchParamsObj: z.infer<typeof SearchParamsSchema> = {}

  if (legacySearchObj.rfc || legacySearchObj.title) {
    searchParamsObj.q = [legacySearchObj.rfc, legacySearchObj.title]
      .filter(Boolean)
      .join(' ')
  }

  if (legacySearchObj.pub_date_type === 'range') {
    if (legacySearchObj.from_year && legacySearchObj.from_month) {
      searchParamsObj.from = `${legacySearchObj.from_year}-${monthNameToNumber(legacySearchObj.from_month, 1)}`
    }
    if (legacySearchObj.to_year && legacySearchObj.to_month) {
      searchParamsObj.to = `${legacySearchObj.to_year}-${monthNameToNumber(legacySearchObj.to_month, 1)}`
    }
  } else if (legacySearchObj.pub_date_type === 'this_month') {
    const now = DateTime.now()
    searchParamsObj.from = now.minus({ month: 1 }).toFormat('yyyy-M')
    searchParamsObj.to = now.toFormat('yyyy-M')
  } else if (legacySearchObj.pub_date_type === 'this_year') {
    const now = DateTime.now()
    searchParamsObj.from = `${now.year}-1`
    searchParamsObj.to = now.toFormat('yyyy-M')
  }

  if (legacySearchObj['pubstatus[]']) {
    const pubstatus =
      Array.isArray(legacySearchObj['pubstatus[]']) ?
        legacySearchObj['pubstatus[]']
      : [legacySearchObj['pubstatus[]']]
    searchParamsObj.statuses = pubstatus
      .map((pubstatus) => {
        for (const [key, value] of sortedStatusMappingFromLegacyToNew) {
          if (typeof value === 'string' && pubstatus === value) {
            return key
          } else if (Array.isArray(value) && value.includes(pubstatus)) {
            return key
          }
        }
        return undefined
      })
      .filter(Boolean)
      .sort()
      .join(',')
  }

  if (legacySearchObj.area_acronym) {
    for (const [key, value] of Object.entries(areasMappingFromLegacyToNew)) {
      if (legacySearchObj.area_acronym === value) {
        searchParamsObj.area = key
      }
    }
  }

  if (legacySearchObj.stream_name) {
    for (const [key, value] of Object.entries(streamMappingFromLegacyToNew)) {
      if (legacySearchObj.stream_name === value) {
        searchParamsObj.stream = key
      }
    }
  }

  return searchParamsObj
}

const lowercaseMonthNames = monthNames.map((monthName) =>
  monthName.toLowerCase()
)

const monthNameToNumber = (
  monthName: string,
  defaultMonthNumber: number
): number => {
  const index = lowercaseMonthNames.indexOf(monthName.toLowerCase())

  if (index === -1) {
    return defaultMonthNumber
  }

  return index + 1 // index is zero based but we want +1 because Jan=1, Feb=2, etc
}

const statusMappingFromLegacyToNew: Record<string, string | string[]> = {
  any: 'Any',
  standard: [
    'Standards Track',
    'Proposed Standard',
    'Draft Standard',
    'Internet Standard'
  ],
  bcp: 'Best Current Practice',
  informational: 'Informational',
  experimental: 'Experimental',
  historic: 'Historic',
  unknown: 'Unknown',
  'not-issued': 'Not Issued'
}

const sortedStatusMappingFromLegacyToNew = Object.entries(
  statusMappingFromLegacyToNew
).sort((a, b) => a[0].localeCompare(b[0]))

const streamMappingFromLegacyToNew: Record<string, string> = {
  '': 'Any',
  ietf: 'IETF',
  irtf: 'IRTF',
  iab: 'IAB',
  ise: 'Independent',
  editorial: 'Editorial',
  legacy: 'Legacy'
}

const areasMappingFromLegacyToNew: Record<string, string> = {
  '': '',
  app: 'app',
  art: 'art',
  gen: 'gen',
  int: 'int',
  ops: 'ops',
  rai: 'rai',
  rtg: 'rtg',
  sec: 'sec',
  tsv: 'tsv',
  wit: 'wit',
  irtf: 'irtf',
  ietf: 'ietf'
}
