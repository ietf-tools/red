import { z } from 'zod'
import { rfcEditorErrataSearchUrl, typeSenseEncodeUriComponent } from './helpers'

const LegacyErrataSearchParamsSchema = z.object({
  rfc: z.string().optional(), // RFC number
  eid: z.string().optional(), // Errata ID
  title: z.string().optional(),
  rec_status: z
    .union([
      z.literal('15'), // All/Any
      z.literal('0'), // Verified+Reported
      z.literal('1'), // Verified
      z.literal('2'), // Reported
      z.literal('3'), // Held for Document Update
      z.literal('9') // Rejected
    ])
    .optional(),
  errata_type: z
    .union([
      z.literal(''), // All/Any
      z.literal('1'), // Editorial
      z.literal('2') // Technical
    ])
    .optional(),
  area_acronym: z
    .union([
      z.literal(''), // All/Any
      z.literal('app'),
      z.literal('art'),
      z.literal('gen'),
      z.literal('int'),
      z.literal('ops'),
      z.literal('rai'),
      z.literal('rtg'),
      z.literal('sec'),
      z.literal('tsv'),
      z.literal('wit')
    ])
    .optional(),
  wg_acronym: z.string().optional(),
  submitter_name: z.string().optional(),
  submit_date: z.string().optional(),
  stream_name: z
    .union([
      z.literal(''), // All/Any
      z.literal('IAB'),
      z.literal('INDEPENDENT'),
      z.literal('IRTF'),
      z.literal('Legacy'),
      z.literal('Editorial')
    ])
    .optional(),
  presentation: z.string().optional()
})

export const legacyErrataSearchRedirectUrlBuilder = (url: string, envDomain = ''): string => {
  // FIXME: ensure the redirect works correctly (the target doesn't exist yet)

  const legacyURLParams = new URL(url, 'https://localhost/').searchParams
  const legacyObj: Record<string, string> = {}

  Array.from(legacyURLParams.entries()).forEach(([key, value]) => {
    // this will clobber duplicate keys but afaik those don't exist in the legacy errata search
    legacyObj[key] = value
  })

  const { data, error } = LegacyErrataSearchParamsSchema.safeParse(legacyObj)

  if (data) {
    return `${buildSearchRedirect(data, envDomain)}`
  }

  // otherwise there was parse bug, so we'll redirect without params
  console.error('Unable to parse redirect', error)

  return rfcEditorErrataSearchUrl(envDomain)
}

type LegacyErrataSearchParams = z.infer<typeof LegacyErrataSearchParamsSchema>

type ErrataSearchPathBuilderParams = {
  rfc_number?: string
  errata_id?: string
  status?: 'any' | 'verified_reported' | 'verified' | 'reported' | 'held' | 'rejected'
  errata_type?: 'any' | 'editorial' | 'technical'
  area?: string
  wg_acronyn?: string
  submit_date?: string
  submitter_name?: string
  presentation?: string
  stream?: string
}

export const buildSearchRedirect = (legacyErrataSearchObj: LegacyErrataSearchParams, envDomain = ''): string => {
  const hasParams = Object.values(legacyErrataSearchObj).join('').trim().length > 0

  if (!hasParams) {
    return rfcEditorErrataSearchUrl(envDomain)
  }

  const newSearchParam: ErrataSearchPathBuilderParams = {}

  newSearchParam.rfc_number = legacyErrataSearchObj.rfc
  newSearchParam.errata_id = legacyErrataSearchObj.eid

  if (legacyErrataSearchObj.rec_status) {
    switch (legacyErrataSearchObj.rec_status) {
      case '0':
        newSearchParam.status = 'verified_reported'
        break
      case '1':
        newSearchParam.status = 'verified'
        break
      case '2':
        newSearchParam.status = 'reported'
        break
      case '9':
        newSearchParam.status = 'rejected'
        break
      case '3':
        newSearchParam.status = 'held'
        break
      case '15':
        newSearchParam.status = 'any'
        break
    }
  }

  if (legacyErrataSearchObj.errata_type) {
    switch (legacyErrataSearchObj.errata_type) {
      case '1':
        newSearchParam.errata_type = 'editorial'
        break
      case '2':
        newSearchParam.errata_type = 'technical'
        break
      default:
        newSearchParam.errata_type = 'any'
        break
    }
  }

  if (legacyErrataSearchObj.area_acronym) {
    newSearchParam.area = legacyErrataSearchObj.area_acronym
  }

  if (legacyErrataSearchObj.wg_acronym) {
    newSearchParam.wg_acronyn = legacyErrataSearchObj.wg_acronym
  }

  if (legacyErrataSearchObj.submit_date) {
    newSearchParam.submit_date = legacyErrataSearchObj.submit_date
  }

  if (legacyErrataSearchObj.submitter_name) {
    newSearchParam.submitter_name = legacyErrataSearchObj.submitter_name
  }

  if (legacyErrataSearchObj.presentation) {
    newSearchParam.presentation = legacyErrataSearchObj.presentation
  }

  if (legacyErrataSearchObj.stream_name) {
    newSearchParam.stream = legacyErrataSearchObj.stream_name
  }

  const params = Object.entries(newSearchParam)
    .toSorted(([aKey], [bKey]) => {
      // normalize order
      return aKey.localeCompare(bKey)
    })
    .map(([searchKey, searchValue]) => {
      return searchValue
        ? `${encodeURIComponent(searchKey)}=${typeSenseEncodeUriComponent(
            Array.isArray(searchValue) ? searchValue.join(',') : searchValue
          )}`
        : ''
    })
    .filter(Boolean)
    .join('&')

  return `${rfcEditorErrataSearchUrl(envDomain)}${params ? `?${params}` : ''}`
}
