import { setTimeoutPromise } from './promises'

type FetchOptions = NonNullable<Parameters<typeof fetch>[1]>

const MAX_RETRIES_DEFAULT = 2
const DELAY_BETWEEN_RETRIES_MS_DEFAULT = 200

/** a `fetch()` wrapper that retries if there's a failure,
   working around transient network errors (ie WiFi connectivity)
*/
export const fetchRetry = (
  url: string,
  fetchOptions?: FetchOptions,
  retryOptions?: {
    delayBetweenRetriesMs: number
    maxRetries: number
  }
) =>
  new Promise<Response>((resolve, reject) => {
    ;(async () => {
      const errors: string[] = []
      let remainingAttempts = retryOptions?.maxRetries ?? MAX_RETRIES_DEFAULT
      while (remainingAttempts > 0) {
        remainingAttempts--
        try {
          const response = await fetch(url, fetchOptions)
          if (!response.ok) {
            throw Error(`HTTP ${response.status}: ${response.statusText}`)
          }
          resolve(response)
          return
        } catch (e: unknown) {
          errors.push(
            typeof e === 'object' && e !== null ? e.toString() : `${e}`
          )
          console.log('error', remainingAttempts, e)
          await setTimeoutPromise(
            retryOptions?.delayBetweenRetriesMs ??
              DELAY_BETWEEN_RETRIES_MS_DEFAULT
          )
        }
      }
      reject(errors.join(','))
    })()
  })
