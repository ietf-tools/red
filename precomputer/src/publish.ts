import { PromisePool } from '@supercharge/promise-pool'
import { uploadRfcData } from './tasks/rfc.ts'
import {
  getApiClient,
  rfcMetadataToRfcCommon,
  safeDocList
} from './utilities/api.ts'
import {
  uploadHomepageLatest,
  NUMBER_OF_LATEST_RFCS_ON_HOMEPAGE
} from './tasks/homepage-latest.ts'
import { ApiClient } from '../generated/api-client.ts'
import { safeURLParse } from './utilities/url.ts'

const NUMBER_OF_CONCURRENT_RFC_PROCESSORS = 8

type Api = InstanceType<typeof ApiClient>
type RedApi = Api['red']
type DocListOptions = Parameters<RedApi['docList']>[0]

const headers = {
  'Content-Type': 'application/json'
}

type CallbackBodyError = {
  type: 'error'
  message: string
}

type CallbackBodySuccess = {
  type: 'success'
  message: string
}

type CallbackBody = CallbackBodyError | CallbackBodySuccess

const createErrorBody = (message: string): CallbackBody => {
  return {
    type: 'error',
    message
  }
}

const createSuccessBody = (message: string): CallbackBody => {
  return {
    type: 'success',
    message
  }
}

const main = async (
  urlCallbackString: string,
  rfcNumbers: number[]
): Promise<void> => {
  const urlCallback = safeURLParse(urlCallbackString)

  if (urlCallback === null) {
    console.error(
      'Failed to parse callback URL. Attempting to post error and then exiting...'
    )
    try {
      // Although the URL parsing failed we'll attempt to post an error to it
      await fetch(urlCallbackString, {
        method: 'POST',
        headers,
        body: JSON.stringify(
          createErrorBody(`Failed to parse callback URL: ${urlCallbackString}`)
        )
      })
    } catch (e) {
      console.error('Failed to post error to callback URL', e)
    }
    process.exit(1)
  }

  const sendErrorAndExit = async (message: string): Promise<void> => {
    console.error(message)
    await fetch(urlCallback, {
      method: 'POST',
      headers,
      body: JSON.stringify(createErrorBody(message))
    })
    process.exit(1)
  }

  const sendSuccessAndExit = async (message: string): Promise<void> => {
    console.error(message)
    await fetch(urlCallback, {
      method: 'POST',
      headers,
      body: JSON.stringify(createSuccessBody(message))
    })
    process.exit(1)
  }

  if (rfcNumbers.some((rfcNumber) => Number.isNaN(rfcNumber))) {
    await sendErrorAndExit(
      `Some RFC numbers were parsed as NaN (${rfcNumbers.join(', ')}). ${JSON.stringify(
        process.argv
      )}`
    )
  }


  if (rfcNumbers.some((rfcNumber) => rfcNumber < 1)) {
    await sendErrorAndExit(
      `Some RFC numbers were negative. ${JSON.stringify(
        process.argv
      )}`
    )
  }

  console.log(
    `Processing ${rfcNumbers.join(', ')}. Using ${NUMBER_OF_CONCURRENT_RFC_PROCESSORS} concurrent promises (results will appear out of order)`
  )

  const { errors } = await PromisePool.for(rfcNumbers)
    .withConcurrency(NUMBER_OF_CONCURRENT_RFC_PROCESSORS)
    .process(async (rfcNumber) => {
      try {
        const isDone = await uploadRfcData(rfcNumber)
        if (isDone) {
          console.log(`[RFC ${rfcNumber}] upload succeeded`)
        } else {
          console.error(
            `[RFC ${rfcNumber}] generation failed. If the RFC was NOT_ISSUED this isn't an error.`
          )
        }
      } catch (err) {
        console.warn(
          `[RFC ${rfcNumber}] threw exception: ${(err as Error).message}`
        )
        throw err
      }
    })

  if (errors.length > 0) {
    console.error(errors)
    await sendErrorAndExit(
      'RFC processing had error(s). Not updating homepage.'
    )
  }

  try {
    const api = getApiClient()
    const docListOptions: DocListOptions = {}
    docListOptions.sort = ['-number'] // we start at the most recent RFC and walk back
    docListOptions.limit = NUMBER_OF_LATEST_RFCS_ON_HOMEPAGE
    const docListResult = await safeDocList(api, docListOptions)
    const latestRfcs = docListResult.results.map(rfcMetadataToRfcCommon)
    const didUpdateHomepageSuccessfully = await uploadHomepageLatest(latestRfcs)

    if (didUpdateHomepageSuccessfully) {
      await sendSuccessAndExit(
        'publishing completed successfully: RFCs updated and homepage updated.'
      )
    } else {
      await sendErrorAndExit(
        'Updating RFCs succeeded but updating homepage did not.'
      )
    }
  } catch (e) {
    console.error(e)
    await sendErrorAndExit(
      'Updating RFCs succeeded but updating homepage did not.'
    )
  }
}

if (!process.argv[2]) {
  throw Error(
    `Script requires a URL callback but argv was ${JSON.stringify(
      process.argv
    )}`
  )
}

if (!process.argv[3]) {
  throw Error(
    `Script requires comma separated list of RFC numbers but argv was ${JSON.stringify(
      process.argv
    )}`
  )
}

const callbackUrlString = process.argv[2]

const commaSeparatedRfcNumbers = process.argv[3]
  .split(',')
  .map((numString) => parseInt(numString, 10))

main(callbackUrlString, commaSeparatedRfcNumbers)
