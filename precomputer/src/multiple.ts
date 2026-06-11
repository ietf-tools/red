import { PromisePool } from '@supercharge/promise-pool'
import { processExitFromUploadResults, processRfcUploadTask, taskItemWasSuccessful } from './utilities/task.ts'
import { indices } from './tasks/indices.ts'
import { getApiClient } from './utilities/api.ts'

const NUMBER_OF_CONCURRENT_RFC_PROCESSORS = 8

const main = async (rfcNumbers: number[]): Promise<void> => {
  console.log(
    `Processing RFCs ${rfcNumbers.join(', ')}. Using ${NUMBER_OF_CONCURRENT_RFC_PROCESSORS} concurrent promises (results may appear out of order).`
  )

  const api = getApiClient()

  const [rfcUploadTasks, indicesUploadTasks] = await Promise.all([
    PromisePool.for(rfcNumbers).withConcurrency(NUMBER_OF_CONCURRENT_RFC_PROCESSORS).process(processRfcUploadTask),
    indices({ api })
  ])

  if (taskItemWasSuccessful(indicesUploadTasks)) {
    console.log('[multiple.ts] Indices updated successfully.')
  } else {
    console.error(
      '[multiple.ts] Indices finished with error(s)' // these errors should be already printed to console
    )
  }

  const { results, errors } = rfcUploadTasks

  processExitFromUploadResults({
    uploadResults: results,
    exceptions: errors,
    filename: 'multiple.ts'
  })
}

if (!process.argv[2]) {
  throw Error(`Script requires RFC Numbers arg but argv was ${JSON.stringify(process.argv)}`)
}

const rfcNumbers = process.argv[2].split(',').map((rfc) => parseInt(rfc.trim(), 10))
if (rfcNumbers.some((rfcNumber) => Number.isNaN(rfcNumber))) {
  throw Error(`RFC number list ${JSON.stringify(process.argv[2])} included a NaN`)
}
main(rfcNumbers)
