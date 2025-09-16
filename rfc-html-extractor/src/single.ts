import { processCron } from './cron.ts'
import { processRfc } from './tasks/rfc.ts'

const main = async (rfcNumber: number): Promise<void> => {
  if(rfcNumber === 0) {
    return await processCron()
  }
  console.log(`Processing RFC ${rfcNumber}...`)
  try {
    const isDone = await processRfc(rfcNumber)
    if (isDone) {
      console.log(`Pushed RFC ${rfcNumber} to bucket successfully.`)
    } else {
      console.error(`Unable to process RFC ${rfcNumber}`)
    }
  } catch (err) {
    console.warn(
      `Failed to process RFC ${rfcNumber}: ${(err as Error).message}`
    )
  }
}

if (!process.argv[2]) {
  throw Error(
    `Script requires RFC Number arg but argv was ${JSON.stringify(
      process.argv
    )}`
  )
}

main(parseInt(process.argv[2], 10))
