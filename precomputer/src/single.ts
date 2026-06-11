import { indices } from './tasks/indices.ts'
import { uploadRfcData } from './tasks/rfc.ts'
import { getApiClient } from './utilities/api.ts'
import { taskItemWasSkipped, taskItemWasSuccessful } from './utilities/task.ts'

const main = async (rfcNumber: number): Promise<void> => {
  console.log(`Processing RFC ${rfcNumber}...`)
  try {
    const uploadResults = await uploadRfcData(rfcNumber)

    const api = getApiClient()
    const indicesResults = await indices({ api })

    const results = [...uploadResults, ...indicesResults]

    if (taskItemWasSkipped(results)) {
      console.log(`[RFC ${rfcNumber}] skipped`)
    } else if (taskItemWasSuccessful(results)) {
      console.log(`Pushed RFC ${rfcNumber} to bucket successfully.`)
      process.exit(0)
    } else {
      console.error(
        `Unable to process RFC ${rfcNumber}. If the RFC was NOT_ISSUED this isn't an error. Results: `,
        uploadResults
      )
    }
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error(`Failed to process RFC ${rfcNumber}: `, err.message, err.stack)
    } else {
      console.error(`Failed to process RFC ${rfcNumber}:`, err)
    }
  }
  process.exit(1)
}

if (!process.argv[2]) {
  throw Error(`Script requires RFC Number arg but argv was ${JSON.stringify(process.argv)}`)
}

main(parseInt(process.argv[2], 10))
