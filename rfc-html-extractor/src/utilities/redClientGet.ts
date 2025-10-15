import { ApiClient } from '../../../client/generated/red-client.ts'
import {
  parseRfcStatusSlug,
  parseRfcStreamSlug,
  parseSubseries,
} from '../../../client/app/utilities/rfc-converter-parse.ts'
import { blankRfcCommon } from './rfc.ts'
import type { Rfc, RfcMetadata } from '../../../client/generated/red-client.ts'
import type { RfcCommon } from '../../../client/app/utilities/rfc-validators.ts'
import { assertIsString } from './typescript.ts'

export const getRedClient = (): ApiClient => {
  const NUXT_PUBLIC_DATATRACKER_BASE = process.env.NUXT_PUBLIC_DATATRACKER_BASE
  const NUXT_CF_SERVICE_TOKEN_ID = process.env.NUXT_CF_SERVICE_TOKEN_ID
  const NUXT_CF_SERVICE_TOKEN_SECRET = process.env.NUXT_CF_SERVICE_TOKEN_SECRET

  if (NUXT_PUBLIC_DATATRACKER_BASE) {
    console.log('Using API', NUXT_PUBLIC_DATATRACKER_BASE)
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
    ...structuredClone(blankRfcCommon),
    subseries: parseSubseries(rfc.subseries),
    number: rfc.number,
    abstract: rfc.abstract,
    published: rfc.published,
    status: parseRfcStatusSlug(rfc.status.slug),
    pages: rfc.pages ?? undefined,
    authors: rfc.authors,
    group: rfc.group,
    area: rfc.area ?? undefined,
    stream: {
      slug: parseRfcStreamSlug(rfc.stream.slug),
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
    ...structuredClone(blankRfcCommon),
    number: rfcMetadata.number,
    abstract: rfcMetadata.abstract,
    published: rfcMetadata.published,
    status: parseRfcStatusSlug(rfcMetadata.status.slug),
    pages: rfcMetadata.pages ?? undefined,
    authors: rfcMetadata.authors,
    group: rfcMetadata.group,
    area: rfcMetadata.area,
    stream: {
      slug: parseRfcStreamSlug(rfcMetadata.stream.slug),
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

  rfcs.sort((a, b) => a.number - b.number)

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

export const getAllSubseries = ({ api }: Props) => api.red.subseriesList({})
