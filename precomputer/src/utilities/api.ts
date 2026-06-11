import { ApiClient } from '../../generated/api-client.ts'
import type { Rfc, RfcMetadata } from '../../generated/api-client.ts'
import {
  RfcCommonGroupTypeSchema,
  RfcCommonStatusSchema,
  RfcCommonSubseriesTypeSchema
} from '../../../website/app/utilities/rfc-validators.ts'
import type { SubseriesCommon, RfcCommon } from '../../../website/app/utilities/rfc-validators.ts'
import { assertIsString } from './typescript.ts'
import { sleep } from './sleep.ts'
import { isRecovereableFetchError } from './fetch.ts'
import { sanitiseHtml } from './html.ts'

type Api = InstanceType<typeof ApiClient>
type RedApi = Api['red']
type DocListOptions = Parameters<RedApi['docList']>[0]

const NUMBER_OF_API_RETRIES = 5
const MINIMUM_DELAY_BETWEEN_REQUESTS_MS = 1000

let hasPrintedAPIUrl = false

export const getApiClient = (): ApiClient => {
  const DATATRACKER_API_BASE = process.env.DATATRACKER_API_BASE
  const NUXT_DATATRACKER_API_KEY = process.env.NUXT_DATATRACKER_API_KEY

  if (DATATRACKER_API_BASE) {
    // Production environment (prod/staging/etc)

    assertIsString(DATATRACKER_API_BASE, "datatracker base wasn't a string")
    assertIsString(NUXT_DATATRACKER_API_KEY, "nuxt datatracker api key wasn't a string")

    const headers: ApiClient['Config']['headers'] = {
      'X-Api-Key': NUXT_DATATRACKER_API_KEY
    }

    const baseUrl = DATATRACKER_API_BASE

    if (hasPrintedAPIUrl === false) {
      console.log('Using API ', baseUrl)
      hasPrintedAPIUrl = true
    }

    return new ApiClient({
      baseUrl,
      headers
    })
  }

  const localServer = 'http://localhost:8000'
  console.log('Using local API', localServer)

  const headers: ApiClient['Config']['headers'] = {
    'X-Api-Key': 'redtoken'
  }

  return new ApiClient({
    baseUrl: localServer,
    headers
  })
}

/**
 * Safety wrapper around docRetrieve access to catch 404 errors,
 * retry if timeouts etc.
 *
 * Currently the API fails about 1/2000 uses when under heavy
 * load from 8 simultaneous Node processes, so this helps recover
 * and try again.
 */
export const safeDocRetrieve = async (api: ApiClient, rfcNumber: number): Promise<Rfc | null> => {
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
      const data = await api.red.docRetrieve(rfcNumber)
      // Although TS says it's an `Rfc` it's possible for network
      // intermediaries to mess with responses and return something else,
      // like login pages (eg Cloudflare Access) that respond with
      // HTTP 200 and text/html or text/plain. So we'll do a quick
      // test of the shape of the response before using it
      if (typeof data === 'object') {
        return data
      }
      console.error("Unexpected API response, wasn't docRetrieve", typeof data, data)
      throw Error(`Unexpected typeof=${typeof data}`)
    } catch (e: unknown) {
      if (isDocRetrieveNotFoundError(e)) {
        return null
      } else if (await isRecovereableFetchError(e)) {
        errors.push(e)
        attemptsRemaining--
        const stepOffMs = (-attemptsRemaining + NUMBER_OF_API_RETRIES + 1) * MINIMUM_DELAY_BETWEEN_REQUESTS_MS
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
  throw Error(`[RFC ${rfcNumber}] Red API docRetrive failure after ${NUMBER_OF_API_RETRIES} retries.`)
}

/**
 * Safety wrapper around subseriesList access to retry on timeouts
 *
 * Currently the API fails about 1/2000 uses when under heavy
 * load from 8 simultaneous Node processes, so this helps recover
 * and try again.
 */
export const safeSubseriesList = async (api: ApiClient, subseriesType?: SubseriesCommon['type']) => {
  let attemptsRemaining = NUMBER_OF_API_RETRIES

  const errors: unknown[] = []
  while (attemptsRemaining > 0) {
    try {
      const data = await api.red.subseriesList(subseriesType ? { type: [subseriesType] } : {})
      // Although TS says it's an `SubseriesDoc[]` it's possible for network
      // intermediaries to mess with responses and return something else,
      // like login pages (eg Cloudflare Access) that respond with
      // HTTP 200 and text/html or text/plain. So we'll do a quick
      // test of the shape of the response before using it
      if (typeof data === 'object') {
        // Don't filter out subseries without members
        // eg STD1 is empty but compare these URLs,
        //  * https://datatracker.ietf.org/doc/std1/ this is HTTP 200 and says it has no members
        //  * https://datatracker.ietf.org/doc/std314159/ this 404s
        // so we don't want to filter empty subseries
        return data
      }
      console.error('Unexpected API response: ', typeof data, data)
      throw Error(`Unexpected API response, wasn't subseriesList: typeof=${typeof data}. See console.`)
    } catch (e: unknown) {
      errors.push(e)
      if (await isRecovereableFetchError(e)) {
        attemptsRemaining--
        const stepOffMs = (-attemptsRemaining + NUMBER_OF_API_RETRIES + 1) * MINIMUM_DELAY_BETWEEN_REQUESTS_MS
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
 * Safety wrapper around docList access to retry on timeouts.
 *
 * Currently the API fails about 1/2000 uses when under heavy
 * load from 8 simultaneous Node processes, so this helps recover
 * and try again.
 */
export const safeDocList = async (api: ApiClient, options: DocListOptions) => {
  let attemptsRemaining = NUMBER_OF_API_RETRIES

  const errors: unknown[] = []
  while (attemptsRemaining > 0) {
    try {
      const data = await api.red.docList(options)
      // Although TS says it's an `PaginatedRfcMetadataList` it's
      // possible for network intermediaries to mess with responses and return something else,
      // like login pages (eg Cloudflare Access) that respond with
      // HTTP 200 and text/html or text/plain. So we'll do a quick
      // test of the shape of the response before using it
      if (typeof data === 'object') {
        return data
      }
      console.error('Unexpected API response: ', typeof data, data)
      throw Error(`Unexpected API response wasn't docList: typeof=${typeof data}. See console.`)
    } catch (e: unknown) {
      errors.push(e)
      if (await isRecovereableFetchError(e)) {
        attemptsRemaining--
        const stepOffMs = (-attemptsRemaining + NUMBER_OF_API_RETRIES + 1) * MINIMUM_DELAY_BETWEEN_REQUESTS_MS
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

const _getRfcCommonCache: Record<number, undefined | Promise<RfcCommon | null>> = {}

export const getRfcCommonCached = async (rfcNumber: number): Promise<RfcCommon | null> => {
  if (!_getRfcCommonCache[rfcNumber]) {
    _getRfcCommonCache[rfcNumber] = getRfcCommon(rfcNumber)
  }
  return _getRfcCommonCache[rfcNumber]
}

/** Convert `Rfc` to `RfcCommon` */
export const rfcToRfcCommon = (rfc: Rfc): RfcCommon => {
  return {
    formats:
      rfc.formats?.map((format): RfcCommon['formats'][number] => ({
        format: format.fmt,
        path: format.name
      })) ?? [],
    subseries: parseSubseries(rfc.subseries),
    number: rfc.number,
    abstract: rfc.abstract ? sanitiseHtml(rfc.abstract, 'abstract') : undefined,
    published: rfc.published,
    status: parseStatus(rfc.status, rfc.number),
    pages: rfc.pages ?? undefined,
    authors: parseAuthors(rfc.authors),
    group: parseGroup(rfc.group),
    area: parseArea(rfc.area),
    stream: {
      slug: parseStreamSlug(rfc.stream.slug),
      name: parseStreamName(rfc.stream.name),
      description: rfc.stream.desc
    },
    identifiers: rfc.identifiers,
    obsoletes: rfc.obsoletes,
    obsoleted_by: rfc.obsoleted_by,
    updates: rfc.updates,
    updated_by: rfc.updated_by,
    draft: parseDraft(rfc.draft),
    keywords: rfc.keywords,
    title: rfc.title
  }
}

/** Convert `RfcMetadata` to `RfcCommon` */
export const rfcMetadataToRfcCommon = (rfcMetadata: RfcMetadata): RfcCommon => {
  return {
    formats:
      rfcMetadata.formats?.map((format): RfcCommon['formats'][number] => ({
        format: format.fmt,
        path: format.name
      })) ?? [],
    number: rfcMetadata.number,
    abstract: rfcMetadata.abstract ? sanitiseHtml(rfcMetadata.abstract, 'abstract') : undefined,
    published: rfcMetadata.published,
    status: parseStatus(rfcMetadata.status, rfcMetadata.number),
    pages: rfcMetadata.pages ?? undefined,
    authors: parseAuthors(rfcMetadata.authors),
    group: parseGroup(rfcMetadata.group),
    area: parseArea(rfcMetadata.area),
    stream: {
      slug: parseStreamSlug(rfcMetadata.stream.slug),
      name: parseStreamName(rfcMetadata.stream.name),
      description: rfcMetadata.stream.desc
    },
    identifiers: rfcMetadata.identifiers,
    obsoletes: rfcMetadata.obsoletes,
    obsoleted_by: rfcMetadata.obsoleted_by,
    updated_by: rfcMetadata.updated_by,
    subseries: parseSubseries(rfcMetadata.subseries),
    draft: parseDraft(rfcMetadata.draft),
    updates: rfcMetadata.updates,
    keywords: rfcMetadata.keywords,
    title: rfcMetadata.title
  }
}

type GetAllRFCsProps = {
  api: ApiClient
  limit?: number
}

export const getAllRFCs = async ({ api, limit }: GetAllRFCsProps): Promise<Readonly<RfcCommon[]>> => {
  console.log(`Downloading metadata for ${limit === undefined ? 'ALL' : limit} rfcs:`)
  const FIRST_RFC_NUMBER = 1
  const MAX_LIMIT_PER_REQUEST = 1000
  const rfcs: RfcCommon[] = []

  const docListOptions: DocListOptions = {}
  docListOptions.sort = ['-number'] // we start at the most recent RFC and walk back to RFC 1
  let offset = 0 // offset is API database row offset, not an RFC number offset, as RFC numbers may be skipped

  while (true) {
    docListOptions.offset = offset
    docListOptions.limit = limit ?? MAX_LIMIT_PER_REQUEST
    const response = await safeDocList(api, docListOptions)
    if (!response.results) {
      // Although TS says this can't happen it can.
      // This can happen if the API response is HTML, caused
      // by an proxy error page
      console.error('No response.results? This seems like an invalid API response.', JSON.stringify(response))
      throw Error(`Bad API response. Expected response.results to be truthy. See console for more`)
    }
    const rfcCommons = response.results.map(rfcMetadataToRfcCommon)
    rfcs.unshift(...rfcCommons)
    rfcs.sort((a, b) => a.number - b.number)

    if (rfcCommons.length > 0) {
      console.log(` - rfc ${rfcCommons[rfcCommons.length - 1].number}-${rfcCommons[0].number}`)
    }

    if (
      // if we got no results then stop
      rfcCommons.length === 0 ||
      // or if we've reached RFC 1
      rfcCommons.some((rfc) => rfc.number === FIRST_RFC_NUMBER) ||
      // or if we've reached a limit of RFCs
      (limit !== undefined && rfcs.length >= limit)
    ) {
      console.log(
        `Finished downloading metadata for ${limit === undefined ? 'ALL' : limit} rfcs (${rfcs[0].number}-${
          rfcs[rfcs.length - 1].number
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

export const parseSubseriesName = (name: string) => {
  const nameParts = name.match(
    // contiguous blocks of either letters or numbers
    /\d+|\D+/g
  )
  if (!nameParts) {
    throw Error(`Unable to parse subseries name ${JSON.stringify(name)} into parts.`)
  }
  const number = parseFloat(nameParts[1])
  if (Number.isNaN(number)) {
    throw Error(`Unable to parse subseries name ${JSON.stringify(name)} number.`)
  }
  return {
    type: RfcCommonSubseriesTypeSchema.parse(nameParts[0]),
    number
  }
}

type GetAllSubseriesProps = {
  api: ApiClient
  type?: SubseriesCommon['type']
}

export const getAllSubseries = async ({ api, type }: GetAllSubseriesProps): Promise<Readonly<SubseriesCommon[]>> => {
  const subseries = await safeSubseriesList(api, type)
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

export const sortSubseriesCommon = (a: SubseriesCommon, b: SubseriesCommon): number => {
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
      `Unable to parse${
        rfcNumberForDebug !== undefined ? ` RFC ${rfcNumberForDebug}` : ''
      } status ${JSON.stringify(status)}").`
    )
  }
  return data
}

const parseDraft = (draft: Rfc['draft'] | RfcMetadata['draft']): RfcCommon['draft'] => {
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

const parseStreamName = (streamName?: string): RfcCommon['stream']['name'] => {
  if (!streamName) {
    return 'Legacy'
  }

  switch (streamName.toLowerCase()) {
    case 'ietf':
      return 'IETF'
    case 'iab':
      return 'IAB'
    case 'irtf':
      return 'IRTF'
    case 'ise':
    case 'independent':
      return 'Independent Stream'
    case 'editorial':
      return 'Editorial'
    case 'legacy':
      return 'Legacy'
  }

  throw Error(`Unable to parse stream name "${streamName}"`)
}

const parseArea = (area: Rfc['area'] | RfcMetadata['area']): RfcCommon['area'] => {
  if (!area) return undefined
  const { acronym, name } = area

  return {
    acronym,
    name
  }
}

const parseGroup = (group: Rfc['group'] | RfcMetadata['group'], rfcNumberForDebug?: number): RfcCommon['group'] => {
  if (
    // https://github.com/ietf-tools/red/issues/337
    !group
  ) {
    return undefined
  }

  const { acronym, name, type } = group
  const { data: parsedType, error } = RfcCommonGroupTypeSchema.safeParse(type)
  if (error) {
    console.error('Zod error for input type: ', JSON.stringify(type), error)
    throw Error(
      `Problem parsing group type ${JSON.stringify(group)} ${
        rfcNumberForDebug !== undefined ? `from RFC ${rfcNumberForDebug}` : ''
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

const parseSubseries = (subseries: Rfc['subseries'] | RfcMetadata['subseries']): RfcCommon['subseries'] => {
  if (!subseries) return undefined

  return subseries.map(
    (subseriesItem): RfcCommonSubseriesItem => ({
      type: parseSubseriesItemType(subseriesItem.type),
      number: parseSubseriesItemName(subseriesItem.name)
    })
  )
}

export const parseSubseriesItemName = (name: RfcSubseriesItem['name']): RfcCommonSubseriesItem['number'] => {
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
    throw Error(`Unable to parse name ${JSON.stringify(name)} into part with number. Was: ${JSON.stringify(nameParts)}`)
  }
  const num = parseFloat(potentialNumber)
  if (Number.isNaN(num)) {
    throw Error(`Unable to parse API rfc subseries name ${JSON.stringify(name)} to extract a number`)
  }
  return num
}

type RfcSubseriesItem = NonNullable<Rfc['subseries']>[number]

const parseSubseriesItemType = (type: RfcSubseriesItem['type']): RfcCommonSubseriesItem['type'] =>
  RfcCommonSubseriesTypeSchema.parse(type)

const parseAuthors = (authors: Rfc['authors'] | RfcMetadata['authors']): RfcCommon['authors'] => {
  return authors
    ? authors.map((author): RfcCommon['authors'][number] => {
        const { titlepage_name, is_editor, person, email, affiliation, country, datatracker_person_path } = author

        return {
          titlepage_name,
          is_editor,
          person: person ?? undefined,
          email,
          affiliation,
          country,
          datatracker_person_path
        }
      })
    : []
}
