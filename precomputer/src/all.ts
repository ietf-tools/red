import { PromisePool } from '@supercharge/promise-pool'
import { range } from 'lodash-es'
import { uploadRfcData } from './tasks/rfc.ts'

const NUMBER_OF_CONCURRENT_RFC_PROCESSORS = 4

const main = async (
  minRfcNumber: number,
  maxRfcNumber: number
): Promise<void> => {
  if (minRfcNumber >= maxRfcNumber) {
    throw Error(
      `Min RFC number (${minRfcNumber}) must be smaller than max RFC number (${maxRfcNumber})`
    )
  }
  const rfcRange = range(minRfcNumber, maxRfcNumber)

  const { errors } = await PromisePool.for(rfcRange)
    .withConcurrency(NUMBER_OF_CONCURRENT_RFC_PROCESSORS)
    .process(async (rfcNumber, i) => {
      console.log(`Processing RFC ${rfcNumber}...`)
      try {
        const isDone = await uploadRfcData(rfcNumber)
        if (isDone) {
          console.log(`Pushed RFC ${rfcNumber} to bucket successfully.`)
        } else {
          console.error(`Unable to process RFC ${rfcNumber}`)
        }
      } catch (err) {
        console.warn(
          `Failed to process ${rfcNumber}: ${(err as Error).message}`
        )
        throw err
      }
    })

    if(errors.length > 0) {
      console.error(errors)
      process.exit(1)
    } else {
      process.exit(0)
    }
}

if (!process.argv[2] || !process.argv[3]) {
  throw Error(
    `Script requires min and max RFC Number args but argv was ${JSON.stringify(
      process.argv
    )}`
  )
}

main(parseInt(process.argv[2], 10), parseInt(process.argv[3], 10))
