import { get } from 'lodash-es'
import { ApiClient } from '../../generated/red-client'
import { FIXME_getRFCMetadataWithMissingData } from './rfc.mocks'
import { setTimeoutPromise } from './promises'
import { needsCloudflareHeaderForApi } from './url'

export const getRedClient = () => {
  const isServer = import.meta.server
  /**
   * FIXME: check to see if this bug is still present and remove the get() if no
   * longer necessary
   *
   * ----
   *
   * Seems like a Nuxt 4.0.3 bug but `vue-tsc` reports a TS error that TS langserver
   * doesn't. The error looks like,
   *
   *   app/utilities/redClientWrappers.ts:8:30 - error TS2339: Property 'env' does not exist
   *                                                           on type 'ImportMeta'.
   *   const isTest = import.meta.env.VITEST
   *                              ~~~
   * We can't use @ts-ignore or @ts-expect-error because whether it's an error depends on
   * whether you're using `vue-tsc` or an IDE. This means @ts-ignore is used on a line
   * without an error which is an error itself, or @ts-expect-error is used on a line
   * without an error which is also an error.
   *
   * So we've obscured the property usage in a lodash get() to work around TS bug.
   *
   * This is horrible.
   *
   * Please delete this asap.
   */
  const isTest = Boolean(get(import.meta, 'env.VITEST'))

  const config = useRuntimeConfig()
  const headers: ApiClient['Config']['headers'] = {}
  const {
    cfServiceTokenId,
    cfServiceTokenSecret,
    public: { datatrackerBase }
  } = config

  if (cfServiceTokenId && typeof cfServiceTokenId === 'string') {
    headers['CF-Access-Client-Id'] = cfServiceTokenId
  }
  if (cfServiceTokenSecret && typeof cfServiceTokenSecret === 'string') {
    headers['CF-Access-Client-Secret'] = cfServiceTokenSecret
  }
  if (typeof datatrackerBase !== 'string') {
    throw Error(
      `Required nuxt.config.ts runtimeConfig.public.datatrackerBase not found (or not a string). Was typeof=${typeof datatrackerBase}. isServer=${isServer}. isTest=${isTest}`
    )
  }

  if (
    needsCloudflareHeaderForApi(datatrackerBase) &&
    (!cfServiceTokenId ||
      typeof cfServiceTokenId !== 'string' ||
      !cfServiceTokenSecret ||
      typeof cfServiceTokenSecret !== 'string')
  ) {
    throw Error(
      `Detected ${datatrackerBase} as prod API but required headers cfServiceTokenId=${typeof cfServiceTokenId} or cfServiceTokenSecret=${typeof cfServiceTokenSecret} were missing. isServer=${isServer}. isTest=${isTest}`
    )
  }

  if (!isServer && !isTest) {
    throw Error(
      `redClientWrapper should only be called serverside or in a test runner. Was isServer=${isServer}. isTest=${isTest}`
    )
  }

  return new ApiClient({
    baseUrl: datatrackerBase,
    headers
  })
}

type DocListArg = Parameters<ApiClient['red']['docList']>[0]

type Props = {
  apiClient: ApiClient
  sort: 'ascending' | 'descending'
  rfcNumberLimit?: number
  delayBetweenRequestsMs?: number
}

const FIRST_RFC_NUMBER = 1
const DEFAULT_DELAY_BETWEEN_REQUESTS = 50
const MAX_LIMIT_PER_REQUEST = 1000

export const getRFCs = async ({
  apiClient,
  sort,
  rfcNumberLimit,
  delayBetweenRequestsMs: customDelayBetweenRequests
}: Props) => {
  const abortController = new AbortController()
  const delayBetweenRequestsMs =
    customDelayBetweenRequests ?? DEFAULT_DELAY_BETWEEN_REQUESTS
  const rfcs: ReturnType<typeof FIXME_getRFCMetadataWithMissingData>[] = []

  const getLargestRfcNumber = async (): Promise<number> => {
    const docListArg: DocListArg = {}
    docListArg.sort = ['-number'] // sort by oldest RFC to find the end
    docListArg.limit = 1 // we only need one result
    const response = await apiClient.red.docList(docListArg)
    const firstResult = response.results[0]
    if (!firstResult) {
      throw Error('Internal error. Unable to retrieve largest RFC number.')
    }
    const largestRfcNumber = firstResult.number
    return largestRfcNumber
  }

  const getEndOfResults = async (): Promise<number> => {
    if (sort === 'ascending') {
      if (rfcNumberLimit === undefined) {
        return getLargestRfcNumber()
      }
      return rfcNumberLimit
    }
    // sort is descending
    if (rfcNumberLimit !== undefined) {
      const largestRfcNumber = await getLargestRfcNumber()
      return Math.max(largestRfcNumber - rfcNumberLimit, FIRST_RFC_NUMBER)
    }
    return FIRST_RFC_NUMBER
  }

  const endOfResultsRfcNumber = await getEndOfResults()

  const docListArg: DocListArg = {}
  docListArg.sort = [sort === 'ascending' ? 'number' : '-number']
  let offset = 0 // offset is API database row offset which is not an RFC number offset

  while (!abortController.signal.aborted) {
    docListArg.offset = offset
    docListArg.limit = Math.min(
      rfcNumberLimit !== undefined ? rfcNumberLimit : Infinity,
      MAX_LIMIT_PER_REQUEST
    ) // as an API optimisation use rfcNumberLimit if not greater than MAX_LIMIT_PER_REQUEST

    const response = await apiClient.red.docList(docListArg)

    const existingRfcNumbers = rfcs.map((rfcMetadata) => rfcMetadata.number)

    rfcs.push(
      ...response.results
        .filter((rfcMetadata) => {
          // if there's an rfcNumberLimit use it to discard extra results
          if (rfcNumberLimit === undefined) {
            return true
          }
          if (sort === 'ascending') {
            return rfcMetadata.number <= endOfResultsRfcNumber
          }
          return rfcMetadata.number >= endOfResultsRfcNumber
        })
        .filter(
          (rfcMetadata) =>
            // the API's database could change during pagination and return the same result
            // so we should ensure we don't already have the RFC (by number)
            !existingRfcNumbers.includes(rfcMetadata.number)
        )
        .map((rfcMetadata) => FIXME_getRFCMetadataWithMissingData(rfcMetadata))
    )

    if (
      // if we got no results then stop
      response.results.length === 0 ||
      // we got some of same results twice while paginating so stop
      response.results.some((rfcMetadata) =>
        existingRfcNumbers.includes(rfcMetadata.number)
      )
    ) {
      break
    }

    if (
      rfcNumberLimit !== undefined ?
        response.results.some((rfcMetadata) =>
          sort === 'ascending' ?
            // some RFC numbers may be missing (ie Not Issued) so it's possible for
            // endOfResultsRfcNumber to not be in the results, that's why we check for numbers
            // beyond the endOfResultsRfcNumber too to know when we've passed it.
            //
            // There's a bug here if the endOfResultsRfcNumber isn't in the results AND if
            // there were no results beyond that. E.g. a rfcNumberLimit of 99999999 will never
            // be found
            rfcMetadata.number >= endOfResultsRfcNumber
          : rfcMetadata.number <= endOfResultsRfcNumber
        )
      : response.results.some(
          (rfcMetadata) => rfcMetadata.number === endOfResultsRfcNumber
        )
    ) {
      // we're at the end
      break
    }

    if (delayBetweenRequestsMs > 0) {
      await setTimeoutPromise(delayBetweenRequestsMs)
    }

    offset += response.results.length
  }

  return rfcs
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
