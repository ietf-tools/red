import { ApiClient } from '../../../client/generated/red-client.ts'
import type { Rfc, RfcMetadata } from '../../../client/generated/red-client.ts'
import type {
  InfoSubseriesItem,
  RfcCommon
} from '../../../client/app/utilities/rfc-validators.ts'
import { assertIsString } from './typescript.ts'

export const getRedClient = (): ApiClient => {
  const NUXT_PUBLIC_DATATRACKER_BASE = process.env.NUXT_PUBLIC_DATATRACKER_BASE
  const NUXT_CF_SERVICE_TOKEN_ID = process.env.NUXT_CF_SERVICE_TOKEN_ID
  const NUXT_CF_SERVICE_TOKEN_SECRET = process.env.NUXT_CF_SERVICE_TOKEN_SECRET

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

    const headers: ApiClient['Config']['headers'] = {
      'CF-Access-Client-Id': NUXT_CF_SERVICE_TOKEN_ID,
      'CF-Access-Client-Secret': NUXT_CF_SERVICE_TOKEN_SECRET
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

export const getRfcCommon = async (rfcNumber: number): Promise<RfcCommon> => {
  const api = getRedClient()
  try {
    const rfc = await api.red.docRetrieve(rfcNumber)
    const rfcCommon = rfcToRfcCommon(rfc)
    return rfcCommon
  } catch (e) {
    console.error('docRetrieve catch()', e)
    throw e
  }
}

const _getRfcCommonCache: Record<number, undefined | Promise<RfcCommon>> = {}

export const getRfcCommonCached = async (
  rfcNumber: number
): Promise<RfcCommon> => {
  if (!_getRfcCommonCache[rfcNumber]) {
    _getRfcCommonCache[rfcNumber] = getRfcCommon(rfcNumber)
  }
  return _getRfcCommonCache[rfcNumber]
}

export const rfcToRfcCommon = (rfc: Rfc): RfcCommon => {
  return {
    formats: rfc.formats,
    subseries: parseSubseries(rfc.subseries),
    number: rfc.number,
    abstract: rfc.abstract,
    published: rfc.published,
    status: parseStatusSlug(rfc.status.slug),
    pages: rfc.pages ?? undefined,
    authors: rfc.authors,
    group: rfc.group,
    area: rfc.area ?? undefined,
    stream: {
      slug: parseStreamSlug(rfc.stream.slug),
      name: rfc.stream.name,
      description: rfc.stream.desc
    },
    identifiers: rfc.identifiers,
    obsoleted_by: rfc.obsoleted_by,
    updated_by: rfc.updated_by,
    title: rfc.title
  }
}

export const rfcMetadataToRfcCommon = (rfcMetadata: RfcMetadata): RfcCommon => {
  return {
    formats: rfcMetadata.formats,
    number: rfcMetadata.number,
    abstract: rfcMetadata.abstract,
    published: rfcMetadata.published,
    status: parseStatusSlug(rfcMetadata.status.slug),
    pages: rfcMetadata.pages ?? undefined,
    authors: rfcMetadata.authors,
    group: rfcMetadata.group,
    area: rfcMetadata.area,
    stream: {
      slug: parseStreamSlug(rfcMetadata.stream.slug),
      name: rfcMetadata.stream.name,
      description: rfcMetadata.stream.desc
    },
    identifiers: rfcMetadata.identifiers,
    obsoleted_by: rfcMetadata.obsoleted_by,
    updated_by: rfcMetadata.updated_by,
    title: rfcMetadata.title
  }
}

type DocListArg = Parameters<ApiClient['red']['docList']>[0]

type Props = {
  api: ApiClient
  delayBetweenRequestsMs?: number
}

const FIRST_RFC_NUMBER = 1
const DELAY_BETWEEN_REQUESTS_MS = 50
const MAX_LIMIT_PER_REQUEST = 1000

export const getAllRFCs = async ({
  api
}: Props): Promise<Readonly<RfcCommon[]>> => {
  console.log('Downloading metadata for ALL rfcs:')
  const rfcs: RfcCommon[] = []

  const docListArg: DocListArg = {}
  docListArg.sort = ['-number'] // we start at the end and walk back to RFC 1
  let offset = 0 // offset is API database row offset, not an RFC number offset

  while (true) {
    docListArg.offset = offset
    docListArg.limit = MAX_LIMIT_PER_REQUEST
    const response = await api.red.docList(docListArg)
    const rfcCommons = response.results.map(rfcMetadataToRfcCommon)
    rfcs.unshift(...rfcCommons)
    rfcs.sort((a, b) => a.number - b.number)

    if (rfcCommons.length > 0) {
      console.log(
        ` - rfc ${rfcCommons[rfcCommons.length - 1].number}-${
          rfcCommons[0].number
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
        `Finished downloading metadata for ALL rfcs (${rfcs[0].number}-${
          rfcs[rfcs.length - 1].number
        })`
      )
      break
    }

    offset += rfcCommons.length

    await setTimeoutPromise(DELAY_BETWEEN_REQUESTS_MS)
  }

  // Attempt to prevent mutation of object (shallow -- not a deep freeze).
  const frozenRfcs = Object.freeze(rfcs)

  return frozenRfcs
}

/** Safety wrapper around docRetrieve access to catch errors  */
export const docRetrieve = async (redApi: ApiClient, rfcNumber: number) => {
  try {
    return await redApi.red.docRetrieve(rfcNumber)
  } catch (e: unknown) {
    // The API client can throw to express 404s... if so, return null
    if (
      e &&
      typeof e === 'object' &&
      'type' in e &&
      e.type === 'client_error' &&
      'errors' in e &&
      Array.isArray(e.errors) &&
      e.errors.length > 0
    ) {
      const error = e.errors[0]
      if ('code' in error && error.code === 'not_found') {
        return null
      }
    }

    const errorMessage = 'Unhandled Red API response'
    console.error(errorMessage, e)
    throw Error(`${errorMessage}. See console`)
  }
}

export const setTimeoutPromise = (timerMs: number) =>
  new Promise((resolve) => setTimeout(resolve, timerMs))

export const getAllSubseries = async ({
  api
}: Props): Promise<Readonly<InfoSubseriesItem[]>> => {
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

  const subseries = await api.red.subseriesList({})
  const sortedSubseries = subseries
    .map((subseriesDoc): InfoSubseriesItem => {
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
    .sort(sortInfoSubseriesItem)

  // Attempt to prevent mutation of object (shallow -- not a deep freeze).
  return Object.freeze(sortedSubseries)
}

export const sortInfoSubseriesItem = (
  a: InfoSubseriesItem,
  b: InfoSubseriesItem
): number => {
  const typeOrder = a.type.localeCompare(b.type)
  if (typeOrder !== 0) {
    return typeOrder
  }
  return a.number - b.number
}

export const parseStatusSlug = (rfcStatusSlug?: string): RfcCommon['status'] => {
  const normalisedSlug = rfcStatusSlug?.toLowerCase().replace(/[^a-z]/g, '')

  switch (normalisedSlug) {
    case 'bestcurrentpractice':
    case 'bcp':
      return {
        slug: 'bcp',
        name: 'Best Current Practice'
      }

    case 'fyi':
      return {
        slug: 'fyi',
        name: 'FYI'
      }

    case 'experimental':
      return {
        slug: 'experimental',
        name: 'Experimental'
      }

    case 'his':
    case 'historic':
      return {
        slug: 'his',
        name: 'Historic'
      }

    case 'informational':
      return {
        slug: 'informational',
        name: 'Informational'
      }

    case 'notissued':
      return {
        slug: 'not-issued',
        name: 'Not Issued'
      }

    case 'internetstandard':
    case 'standard':
    case 'standardstrack':
    case 'std':
      return {
        slug: 'standard',
        name: 'Internet Standard'
      }

    case 'unknown':
      return {
        slug: 'unknown',
        name: 'Unknown'
      }

    case 'ps':
    case 'proposedstandard':
    case 'proposed':
      return {
        slug: 'ps',
        name: 'Proposed Standard'
      }

    case 'draftstandard':
    case 'draft':
      return {
        slug: 'draft',
        name: 'Draft Standard'
      }
  }

  throw Error(
    `Unable to parse status slug "${rfcStatusSlug}" (normalized as "${normalisedSlug}").`
  )
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

type RfcCommonSubseriesItem = NonNullable<RfcCommon['subseries']>[number]

const parseSubseries = (
  subseries: Rfc['subseries']
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
): RfcCommonSubseriesItem['type'] => {
  switch (type) {
    case 'bcp':
      return 'bcp'
    case 'fyi':
      return 'fyi'
    case 'std':
      return 'std'
  }
  throw Error(`Unable to parse API rfc subseries type ${JSON.stringify(type)}`)
}
