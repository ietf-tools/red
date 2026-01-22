import { ApiClient } from '../../generated/api-client.ts'
import type { Rfc, RfcMetadata } from '../../generated/api-client.ts'
import {
  RfcCommonAreaTypeSchema,
  RfcCommonGroupTypeSchema,
  RfcCommonStatusSchema,
  RfcCommonSubseriesTypeSchema
} from '../../../website/app/utilities/rfc-validators.ts'
import type {
  SubseriesCommon,
  RfcCommon
} from '../../../website/app/utilities/rfc-validators.ts'
import { assertIsString } from './typescript.ts'
import { sleep } from './sleep.ts'
import { isRecovereableFetchError } from './fetch.ts'

type Api = InstanceType<typeof ApiClient>
type RedApi = Api['red']
type DocListOptions = Parameters<RedApi['docList']>[0]

const NUMBER_OF_API_RETRIES = 5
const MINIMUM_DELAY_BETWEEN_REQUESTS_MS = 1000

export const getApiClient = (): ApiClient => {
  const NUXT_PUBLIC_DATATRACKER_BASE = process.env.NUXT_PUBLIC_DATATRACKER_BASE
  const NUXT_CF_SERVICE_TOKEN_ID = process.env.NUXT_CF_SERVICE_TOKEN_ID
  const NUXT_CF_SERVICE_TOKEN_SECRET = process.env.NUXT_CF_SERVICE_TOKEN_SECRET
  const NUXT_DATATRACKER_API_KEY = process.env.NUXT_DATATRACKER_API_KEY

  if (NUXT_PUBLIC_DATATRACKER_BASE) {
    // console.log('Using API', NUXT_PUBLIC_DATATRACKER_BASE)
    assertIsString(
      NUXT_PUBLIC_DATATRACKER_BASE,
      "datatracker base wasn't a string"
    )
    assertIsString(NUXT_CF_SERVICE_TOKEN_ID, "cloudflare token wasn't a string")
    assertIsString(
      NUXT_CF_SERVICE_TOKEN_SECRET,
      "cloudflare secret wasn't a string"
    )
    assertIsString(
      NUXT_DATATRACKER_API_KEY,
      "nuxt datatracker api key wasn't a string"
    )

    const headers: ApiClient['Config']['headers'] = {
      'CF-Access-Client-Id': NUXT_CF_SERVICE_TOKEN_ID,
      'CF-Access-Client-Secret': NUXT_CF_SERVICE_TOKEN_SECRET,
      'X-Api-Key': NUXT_DATATRACKER_API_KEY
    }

    return new ApiClient({
      baseUrl: NUXT_PUBLIC_DATATRACKER_BASE,
      headers
    })
  }

  const localServer = 'http://localhost:8000'
  console.log('Using local API', localServer)

  return new ApiClient({
    baseUrl: localServer
  })
}

/**
 * Safety wrapper around docRetrieve access to catch 404 errors, retry if timeouts etc
 * Currently the API fails about 1/2000 uses
 */
export const safeDocRetrieve = async (
  api: ApiClient,
  rfcNumber: number
): Promise<Rfc | null> => {
  const isDocRetrieveNotFoundError = (e: unknown) => {
    return (
      e &&
      typeof e === 'object' &&
      'type' in e &&
      e.type === 'client_error' &&
      'errors' in e &&
      Array.isArray(e.errors) &&
      e.errors.length > 0 &&
      e.errors.some(
        (error) =>
          'code' in error &&
          // The API client can throw to indicate 404s... if so, return null
          error.code === 'not_found'
      )
    )
  }

  let attemptsRemaining = NUMBER_OF_API_RETRIES
  const errors: unknown[] = []

  while (attemptsRemaining > 0) {
    try {
      return await api.red.docRetrieve(rfcNumber)
    } catch (e: unknown) {
      if (isDocRetrieveNotFoundError(e)) {
        return null
      } else if (await isRecovereableFetchError(e)) {
        errors.push(e)
        attemptsRemaining--
        const stepOffMs =
          (-attemptsRemaining + NUMBER_OF_API_RETRIES + 1) *
          MINIMUM_DELAY_BETWEEN_REQUESTS_MS
        console.warn(
          `[RFC ${rfcNumber}] API connection problem. ${attemptsRemaining} attempts remaining. Retrying in ${stepOffMs}ms`
        )
        await sleep(stepOffMs)
      } else {
        const errorMessage = `[RFC ${rfcNumber}] unhandled API response`
        console.error(e)
        throw Error(`${errorMessage}. See console`)
      }
    }
  }

  console.log('[DocRetrieve] No attempts remaining. Errors were', ...errors)
  throw Error(
    `[RFC ${rfcNumber}] Red API docRetrive failure after ${NUMBER_OF_API_RETRIES} retries.`
  )
}

/**
 * Safety wrapper around subseriesList access to retry on timeouts
 * Currently the API fails about 1/2000 uses
 */
export const safeSubseriesList = async (api: ApiClient) => {
  let attemptsRemaining = NUMBER_OF_API_RETRIES

  const errors: unknown[] = []
  while (attemptsRemaining > 0) {
    try {
      return await api.red.subseriesList({})
    } catch (e: unknown) {
      errors.push(e)
      if (await isRecovereableFetchError(e)) {
        attemptsRemaining--
        const stepOffMs =
          (-attemptsRemaining + NUMBER_OF_API_RETRIES + 1) *
          MINIMUM_DELAY_BETWEEN_REQUESTS_MS
        console.warn(
          `[SubseriesList] API connection problem. ${attemptsRemaining} attempts remaining. Retrying in ${stepOffMs}ms`
        )
        await sleep(stepOffMs)
      } else {
        const errorMessage = `[SubseriesList] unhandled API response`
        console.error(e)
        throw Error(`${errorMessage}. See console`)
      }
    }
  }

  console.log('[SubseriesList] No attempts remaining. Errors were', ...errors)
  throw new Error(`[SubseriesList] Unable to access subseriesList`)
}

/**
 * Safety wrapper around docList access to retry on timeouts
 * Currently the API fails about 1/2000 uses
 */
export const safeDocList = async (api: ApiClient, options: DocListOptions) => {
  let attemptsRemaining = NUMBER_OF_API_RETRIES

  const errors: unknown[] = []
  while (attemptsRemaining > 0) {
    try {
      return await api.red.docList(options)
    } catch (e: unknown) {
      errors.push(e)
      if (await isRecovereableFetchError(e)) {
        attemptsRemaining--
        const stepOffMs =
          (-attemptsRemaining + NUMBER_OF_API_RETRIES + 1) *
          MINIMUM_DELAY_BETWEEN_REQUESTS_MS
        console.warn(
          `[DocList] API connection problem. ${attemptsRemaining} attempts remaining. Retrying in ${stepOffMs}ms`
        )
        await sleep(stepOffMs)
      } else {
        const errorMessage = `[DocList] unhandled API response`
        console.error(e)
        throw Error(`${errorMessage}. See console`)
      }
    }
  }

  console.log('[DocList] No attempts remaining. Errors were', ...errors)
  throw new Error(`[DocList] Unable to access docList`)
}

const getRfcCommon = async (rfcNumber: number): Promise<RfcCommon | null> => {
  const api = getApiClient()
  try {
    const rfc = await safeDocRetrieve(api, rfcNumber)
    if (rfc === null) {
      return null
    }
    const rfcCommon = rfcToRfcCommon(rfc)
    return rfcCommon
  } catch (e) {
    console.error('safeDocRetrieve catch()', e)
    throw e
  }
}

const _getRfcCommonCache: Record<
  number,
  undefined | Promise<RfcCommon | null>
> = {}

export const getRfcCommonCached = async (
  rfcNumber: number
): Promise<RfcCommon | null> => {
  if (!_getRfcCommonCache[rfcNumber]) {
    _getRfcCommonCache[rfcNumber] = getRfcCommon(rfcNumber)
  }
  return _getRfcCommonCache[rfcNumber]
}

/** Convert `Rfc` to `RfcCommon` */
export const rfcToRfcCommon = (rfc: Rfc): RfcCommon => {
  return {
    formats: rfc.formats,
    subseries: parseSubseries(rfc.subseries),
    number: rfc.number,
    abstract: rfc.abstract,
    published: rfc.published,
    status: parseStatus(rfc.status, rfc.number),
    pages: rfc.pages ?? undefined,
    authors: parseAuthors(rfc.authors),
    group: parseGroup(rfc.group),
    area: parseArea(rfc.area),
    stream: {
      slug: parseStreamSlug(rfc.stream.slug),
      name: rfc.stream.name,
      description: rfc.stream.desc
    },
    identifiers: rfc.identifiers,
    obsoletes: rfc.obsoletes,
    obsoleted_by: rfc.obsoleted_by,
    updates: rfc.updates,
    updated_by: rfc.updated_by,
    see_also: rfc.see_also,
    draft: parseDraft(rfc.draft),
    keywords: rfc.keywords,
    errata: rfc.errata,
    title: rfc.title
  }
}

/** Convert `RfcMetadata` to `RfcCommon` */
export const rfcMetadataToRfcCommon = (rfcMetadata: RfcMetadata): RfcCommon => {
  return {
    formats: rfcMetadata.formats,
    number: rfcMetadata.number,
    abstract: rfcMetadata.abstract,
    published: rfcMetadata.published,
    status: parseStatus(rfcMetadata.status, rfcMetadata.number),
    pages: rfcMetadata.pages ?? undefined,
    authors: parseAuthors(rfcMetadata.authors),
    group: parseGroup(rfcMetadata.group),
    area: parseArea(rfcMetadata.area),
    stream: {
      slug: parseStreamSlug(rfcMetadata.stream.slug),
      name: rfcMetadata.stream.name,
      description: rfcMetadata.stream.desc
    },
    identifiers: rfcMetadata.identifiers,
    obsoletes: rfcMetadata.obsoletes,
    obsoleted_by: rfcMetadata.obsoleted_by,
    updated_by: rfcMetadata.updated_by,
    subseries: parseSubseries(rfcMetadata.subseries),
    draft: parseDraft(rfcMetadata.draft),
    see_also: rfcMetadata.see_also,
    updates: rfcMetadata.updates,
    keywords: rfcMetadata.keywords,
    errata: rfcMetadata.errata,
    title: rfcMetadata.title
  }
}

type Props = {
  api: ApiClient
  delayBetweenRequestsMs?: number
}

export const getAllRFCs = async ({
  api
}: Props): Promise<Readonly<RfcCommon[]>> => {
  console.log('Downloading metadata for ALL rfcs:')
  const FIRST_RFC_NUMBER = 1
  const MAX_LIMIT_PER_REQUEST = 1000
  const rfcs: RfcCommon[] = []

  const docListOptions: DocListOptions = {}
  docListOptions.sort = ['-number'] // we start at the most recent RFC and walk back to RFC 1
  let offset = 0 // offset is API database row offset, not an RFC number offset

  while (true) {
    docListOptions.offset = offset
    docListOptions.limit = MAX_LIMIT_PER_REQUEST
    const response = await safeDocList(api, docListOptions)
    const rfcCommons = response.results.map(rfcMetadataToRfcCommon)
    rfcs.unshift(...rfcCommons)
    rfcs.sort((a, b) => a.number - b.number)

    if (rfcCommons.length > 0) {
      console.log(
        ` - rfc ${rfcCommons[rfcCommons.length - 1].number}-${rfcCommons[0].number
        }`
      )
    }

    if (
      // if we got no results then stop
      rfcCommons.length === 0 ||
      // or if we've reached RFC 1
      rfcCommons.some((rfc) => rfc.number === FIRST_RFC_NUMBER)
    ) {
      console.log(
        `Finished downloading metadata for ALL rfcs (${rfcs[0].number}-${rfcs[rfcs.length - 1].number
        })`
      )
      break
    }

    offset += rfcCommons.length

    await sleep(MINIMUM_DELAY_BETWEEN_REQUESTS_MS)
  }

  // Attempt to prevent mutation of object (shallow -- not a deep freeze).
  const frozenRfcs = Object.freeze(rfcs)

  return frozenRfcs
}

export const getAllSubseries = async ({
  api
}: Props): Promise<Readonly<SubseriesCommon[]>> => {
  const parseSubseriesName = (
    name: string
  ): { type: string; number: number } => {
    const nameParts = name.match(
      // contiguous blocks of either letters or numbers
      /\d+|\D+/g
    )
    if (!nameParts) {
      throw Error(
        `Unable to parse subseries name ${JSON.stringify(name)} into parts.`
      )
    }
    const number = parseFloat(nameParts[1])
    if (Number.isNaN(number)) {
      throw Error(
        `Unable to parse subseries name ${JSON.stringify(name)} number.`
      )
    }
    return {
      type: nameParts[0],
      number
    }
  }

  const subseries = await safeSubseriesList(api)
  const sortedSubseries = subseries
    .map((subseriesDoc): SubseriesCommon => {
      const parts = parseSubseriesName(subseriesDoc.name)
      return {
        type: parseSubseriesItemType(parts.type),
        number: parts.number,
        contents: subseriesDoc.contents.map((rfc) =>
          rfcToRfcCommon({
            ...rfc,
            text: ''
          })
        )
      }
    })
    .sort(sortSubseriesCommon)

  // Attempt to prevent mutation of object (shallow -- not a deep freeze).
  return Object.freeze(sortedSubseries)
}

export const sortSubseriesCommon = (
  a: SubseriesCommon,
  b: SubseriesCommon
): number => {
  const typeOrder = a.type.localeCompare(b.type)
  if (typeOrder !== 0) {
    return typeOrder
  }
  return a.number - b.number
}

/**
 * Parsers for parts of RFC/subseries documents
 */

export const parseStatus = (
  status: Rfc['status'] | RfcMetadata['status'] | undefined,
  rfcNumberForDebug?: number
): RfcCommon['status'] => {
  if (
    // FIXME: when all RFCs have a status remove this
    status === undefined
  ) {
    return {
      slug: 'unkn',
      name: 'unknown'
    }
  }
  const { data, error } = RfcCommonStatusSchema.safeParse(status)
  if (error) {
    throw Error(
      `Unable to parse${rfcNumberForDebug !== undefined ? ` RFC ${rfcNumberForDebug}` : ''
      } status ${JSON.stringify(status)}").`
    )
  }
  return data
}

const parseDraft = (
  draft: Rfc['draft'] | RfcMetadata['draft']
): RfcCommon['draft'] => {
  if (draft === undefined) return undefined
}

const parseStreamSlug = (streamSlug?: string): RfcCommon['stream']['slug'] => {
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

const parseArea = (
  area: Rfc['area'] | RfcMetadata['area'],
  rfcNumberForDebug?: number
): RfcCommon['area'] => {
  if (!area) return undefined
  const fromRfcErrorSuffix =
    rfcNumberForDebug !== undefined ? ` from RFC ${rfcNumberForDebug}` : ''
  const { acronym, name, type } = area
  const { data: parsedType, error } = RfcCommonAreaTypeSchema.safeParse(type)
  if (error) {
    console.error(error)
    throw Error(
      `Problem parsing area type ${JSON.stringify(area)}${fromRfcErrorSuffix}`
    )
  }
  return {
    acronym,
    name,
    type: parsedType
  }
}

const parseGroup = (
  group: Rfc['group'] | RfcMetadata['group'],
  rfcNumberForDebug?: number
): RfcCommon['group'] => {
  const { acronym, name, type } = group
  const { data: parsedType, error } = RfcCommonGroupTypeSchema.safeParse(type)
  if (error) {
    console.error(error)
    throw Error(
      `Problem parsing group type ${JSON.stringify(group)} ${rfcNumberForDebug !== undefined ? `from RFC ${rfcNumberForDebug}` : ''
      }`
    )
  }
  return {
    acronym,
    name,
    type: parsedType
  }
}

type RfcCommonSubseriesItem = NonNullable<RfcCommon['subseries']>[number]

const parseSubseries = (
  subseries: Rfc['subseries'] | RfcMetadata['subseries']
): RfcCommon['subseries'] => {
  if (!subseries) return undefined

  return subseries.map(
    (subseriesItem): RfcCommonSubseriesItem => ({
      type: parseSubseriesItemType(subseriesItem.type),
      number: parseSubseriesItemName(subseriesItem.name)
    })
  )
}

export const parseSubseriesItemName = (
  name: RfcSubseriesItem['name']
): RfcCommonSubseriesItem['number'] => {
  // name should look like "bcp123"
  const nameParts = name
    .replace(
      // remove whitespace including non-breaking-space
      /\s/g,
      ''
    )
    .match(
      // contiguous blocks of either letters or numbers
      /\d+|\D+/g
    )
  if (nameParts === null) {
    throw Error(`Unable to parse name ${JSON.stringify(name)} into parts`)
  }
  const potentialNumber = nameParts[1] // index 1 should be the number part
  if (potentialNumber === undefined) {
    throw Error(
      `Unable to parse name ${JSON.stringify(
        name
      )} into part with number. Was: ${JSON.stringify(nameParts)}`
    )
  }
  const num = parseFloat(potentialNumber)
  if (Number.isNaN(num)) {
    throw Error(
      `Unable to parse API rfc subseries name ${JSON.stringify(
        name
      )} to extract a number`
    )
  }
  return num
}

type RfcSubseriesItem = NonNullable<Rfc['subseries']>[number]

const parseSubseriesItemType = (
  type: RfcSubseriesItem['type']
): RfcCommonSubseriesItem['type'] => RfcCommonSubseriesTypeSchema.parse(type)


const parseAuthors = (authors: Rfc["authors"] | RfcMetadata["authors"]): RfcCommon["authors"] => {
  return authors ? authors.map((author): RfcCommon["authors"][number] => {
    return {
      titlepage_name: author.titlepage_name,
      is_editor: author.is_editor,
      person: author.person ?? undefined,
      email: author.email ?? undefined,
      affiliation: author.affiliation,
      country: author.country,
      datatracker_person_path: author.datatracker_person_path,
    }
  }) : []
} 