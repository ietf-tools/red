import { z } from 'zod'
import {
  RFC_EDITOR_ERRATA_SEARCH_URL,
  typeSenseEncodeUriComponent
} from './url'

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
    .optional()
})

export const legacyErrataSearchRedirectUrlBuilder = (url: string): string => {
  // FIXME: ensure the redirect works correctly (the target doesn't exist yet)

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

  const legacySearchParams = LegacyErrataSearchParamsSchema.safeParse(legacyObj)

  if (legacySearchParams.data) {
    return buildSearchRedirect(legacySearchParams.data)
  }

  return RFC_EDITOR_ERRATA_SEARCH_URL
}

type LegacyErrataSearchParams = z.infer<typeof LegacyErrataSearchParamsSchema>

export const buildSearchRedirect = (
  legacyErrataSearchObj: z.infer<typeof LegacyErrataSearchParamsSchema>
): string => {
  const hasParams =
    Object.values(legacyErrataSearchObj).join('').trim().length > 0

  const params =
    hasParams ?
      Object.keys(legacyErrataSearchObj)
        .sort() // normalize order
        .map((searchKey) => {
          const typesenseSearchKey = searchKey
          const searchValue =
            legacyErrataSearchObj[searchKey as keyof LegacyErrataSearchParams]

          return searchValue ?
              `${encodeURIComponent(typesenseSearchKey)}=${typeSenseEncodeUriComponent(
                Array.isArray(searchValue) ? searchValue.join(',') : searchValue
              )}`
            : ''
        })
        .filter(Boolean)
        .join('&')
    : ''

  return `${RFC_EDITOR_ERRATA_SEARCH_URL}${params ? '?' : ''}${params}`
}
