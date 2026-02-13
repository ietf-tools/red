import { PromisePool } from '@supercharge/promise-pool'
import { uploadRfcData } from './tasks/rfc.ts'
import { indices } from './tasks/indices.ts'
import { getApiClient } from './utilities/api.ts'

const NUMBER_OF_CONCURRENT_RFC_PROCESSORS = 8

const main = async (rfcNumbers: number[]): Promise<void> => {
  console.log(
    `Processing RFCs ${rfcNumbers.join(', ')}. Using ${NUMBER_OF_CONCURRENT_RFC_PROCESSORS} concurrent promises (results will appear out of order).`
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
    console.log('multiple.ts finished with error(s)')
    console.error(errors)
    process.exit(1)
  }

  console.log('Individual RFCs updated, now updating indices...')
  const api = getApiClient()
  const isSuccessful = await indices({ api })
  if (!isSuccessful) {
    console.error(
      'multiple.ts finished with error(s)' // these errors should be already printed to console
    )
    process.exit(1)
  }

  console.log('multiple.ts finished successfully')
  process.exit(0)
}

if (!process.argv[2]) {
  throw Error(
    `Script requires RFC Numbers arg but argv was ${JSON.stringify(
      process.argv
    )}`
  )
}

const rfcNumbers = process.argv[2].split(',').map(rfc => parseInt(rfc.trim(), 10))
if (rfcNumbers.some(rfcNumber => Number.isNaN(rfcNumber))) {
  throw Error(`RFC number list ${JSON.stringify(process.argv[2])} included a NaN`)
}
main(rfcNumbers)
