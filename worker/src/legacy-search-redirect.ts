import { z } from 'zod'
import { DateTime } from 'luxon'
import { monthNames, searchPathBuilder, statusSchema } from './helpers'

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

export const legacySearchRedirectPathBuilder = (url: string, envDomain = ''): string => {
  const legacyURLParams = new URL(url, 'https://localhost/').searchParams
  const legacyObj: Record<string, string | string[]> = {}

  // convert URL into object so we can validate it
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

  const { data, error } = LegacySearchParamsSchema.safeParse(legacyObj)

  if (data) {
    return buildSearchRedirect(data, envDomain)
  }

  // otherwise there was parse bug, so we'll redirect without params
  console.error('Unable to parse redirect', JSON.stringify(legacyObj), error)

  return searchPathBuilder({}, envDomain)
}

type SearchPathBuilderParams = Parameters<typeof searchPathBuilder>[0]

export const buildSearchRedirect = (
  legacySearchObj: z.infer<typeof LegacySearchParamsSchema>,
  envDomain = ''
): string => {
  const searchParam: SearchPathBuilderParams = {}

  if (legacySearchObj.rfc || legacySearchObj.title) {
    searchParam.q = [legacySearchObj.rfc, legacySearchObj.title].filter(Boolean).join(' ')
  }

  if (legacySearchObj.pub_date_type === 'range') {
    if (legacySearchObj.from_year && legacySearchObj.from_month) {
      searchParam.from = `${legacySearchObj.from_year}-${monthNameToNumber(legacySearchObj.from_month, 1)}`
    }
    if (legacySearchObj.to_year && legacySearchObj.to_month) {
      searchParam.to = `${legacySearchObj.to_year}-${monthNameToNumber(legacySearchObj.to_month, 1)}`
    }
  } else if (legacySearchObj.pub_date_type === 'this_month') {
    const now = DateTime.now()
    searchParam.from = now.minus({ month: 1 }).toFormat('yyyy-M')
    searchParam.to = now.toFormat('yyyy-M')
  } else if (legacySearchObj.pub_date_type === 'this_year') {
    const now = DateTime.now()
    searchParam.from = `${now.year}-1`
    searchParam.to = now.toFormat('yyyy-M')
  }

  const legacySearchObjPubstatus = legacySearchObj['pubstatus[]']
  const pubstatusArray = Array.isArray(legacySearchObjPubstatus) ? legacySearchObjPubstatus : [legacySearchObjPubstatus]
  if (pubstatusArray) {
    searchParam.status = pubstatusArray
      .map((pubstatus) => {
        if (pubstatus) {
          for (const [newValue, legacyValuesArray] of sortedStatusMappingFromLegacyToNew) {
            if (legacyValuesArray.includes(pubstatus)) {
              return newValue
            }
          }
        }
        return undefined
      })
      .filter((status) => typeof status === 'string')
      .sort()
      .map((maybeStatus) => statusSchema.parse(maybeStatus))
  }

  if (legacySearchObj.std_trk) {
    if (
      // this param is a subcategory of `pubstatus[] === 'Standards Track'` so it only applies if that was checked
      pubstatusArray &&
      pubstatusArray.includes('Standards Track')
    ) {
      searchParam.status = searchParam.status ?? []

      switch (legacySearchObj.std_trk.toLowerCase()) {
        case 'all':
          searchParam.status.push('Proposed Standard')
          searchParam.status.push('Draft Standard')
          searchParam.status.push('Internet Standard')
          break
        case 'proposed standard':
          searchParam.status.push('Proposed Standard')
          break
        case 'draft standard':
          searchParam.status.push('Draft Standard')
          break
        case 'internet standard':
        case 'standard':
          searchParam.status.push('Internet Standard')
          break
      }
    }
  }

  if (searchParam.status && searchParam.status.length === 0) {
    searchParam.status = undefined
  }

  if (legacySearchObj.area_acronym) {
    for (const [key, value] of Object.entries(areasMappingFromLegacyToNew)) {
      if (legacySearchObj.area_acronym === value) {
        searchParam.area = key
      }
    }
  }

  if (legacySearchObj.stream_name) {
    for (const [key, value] of Object.entries(streamMappingFromLegacyToNew)) {
      if (legacySearchObj.stream_name === value) {
        searchParam.stream = key
      }
    }
  }

  return searchPathBuilder(searchParam, envDomain)
}

const lowercaseMonthNames = monthNames.map((monthName) => monthName.toLowerCase())

const monthNameToNumber = (monthName: string, defaultMonthNumber: number): number => {
  const index = lowercaseMonthNames.indexOf(monthName.toLowerCase())

  if (index === -1) {
    return defaultMonthNumber
  }

  return index + 1 // index is zero based but we want +1 because Jan=1, Feb=2, etc
}

const statusMappingFromLegacyToNew: Record<string, string[]> = {
  'Proposed Standard': ['Proposed Standard'],
  'Draft Standard': ['Draft Standard'],
  'Internet Standard': ['Internet Standard', 'standard'],
  'Best Current Practice': ['Best Current Practice', 'bcp'],
  Informational: ['Informational', 'fyi'],
  Experimental: ['Experimental', 'exp'],
  Historic: ['Historic', 'his'],
  Unknown: ['Unknown', 'unk'],
  'Not Issued': ['Not Issued']
}

const sortedStatusMappingFromLegacyToNew = Object.entries(statusMappingFromLegacyToNew).sort((a, b) =>
  a[0].localeCompare(b[0])
)

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
