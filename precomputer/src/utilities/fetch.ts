import { sleep } from './sleep.ts'

const NUMBER_OF_FETCH_RETRIES = 5
const MINIMUM_DELAY_BETWEEN_REQUESTS_MS = 1000

export const fetchRfcRetry = async (url: string, rfcNumberForDebug: number): Promise<Response> => {
  let attemptsRemaining = NUMBER_OF_FETCH_RETRIES

  const errors: unknown[] = []
  while (attemptsRemaining > 0) {
    try {
      return await fetch(url)
    } catch (e) {
      errors.push(e)
      if (await isRecovereableFetchError(e)) {
        attemptsRemaining--
        const stepOffMs = (-attemptsRemaining + NUMBER_OF_FETCH_RETRIES + 1) * MINIMUM_DELAY_BETWEEN_REQUESTS_MS
        console.warn(
          `[RFC ${rfcNumberForDebug}] fetchRfcRetry network or server problem. ${attemptsRemaining} attempts remaining. Retrying in ${stepOffMs}ms`
        )
        await sleep(stepOffMs)
      } else {
        const errorMessage = `[RFC ${rfcNumberForDebug}] fetchRfcRetry unhandled API response`
        console.error(e)
        throw Error(`${errorMessage}. See console`)
      }
    }
  }

  console.log(`[RFC ${rfcNumberForDebug}] no fetch attempts remaining. Errors were`, ...errors)
  throw Error(`[RFC ${rfcNumberForDebug}] fetch failed after ${NUMBER_OF_FETCH_RETRIES} retries.`)
}

/**
 * Attempts to decide whether an error thrown by fetch() is a
 * temporary glitch that will likely succeed if tried again.
 */
export const isRecovereableFetchError = async (error: unknown): Promise<boolean> => {
  if (
    error instanceof TypeError &&
    error.cause instanceof AggregateError &&
    error.cause.errors.some((error) => 'code' in error && (error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET'))
  ) {
    return true
  }
  if (
    error instanceof TypeError &&
    error.cause &&
    typeof error.cause === 'object' &&
    'code' in error.cause &&
    (error.cause.code === 'ETIMEDOUT' || error.cause.code === 'ECONNRESET')
  ) {
    return true
  }
  const HTTP_502_BAD_GATEWAY = 502
  if (error instanceof Response && error.status === HTTP_502_BAD_GATEWAY) {
    // Bad gateway errors seem to typically take longer to recover from, so we'll sleep for a bit
    await sleep(10000)
    return true
  }
  const HTTP_408_TIMEOUT_STATUS_CODE = 408
  if (
    error instanceof Response &&
    (error.status === HTTP_408_TIMEOUT_STATUS_CODE || error.status.toString().startsWith('5'))
  ) {
    return true
  }
  return false
}
