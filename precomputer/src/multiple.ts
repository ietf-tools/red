import { PromisePool } from '@supercharge/promise-pool'
import { processExitFromUploadResults, processRfcUploadTask, taskItemWasSuccessful } from './utilities/task.ts'
import { indices } from './tasks/indices.ts'
import { getApiClient } from './utilities/api.ts'

const NUMBER_OF_CONCURRENT_RFC_PROCESSORS = 8

/**
 * Rebuild only the per-RFC files. The indices exist so a newly published RFC is listed in
 * the same run as its page; a caller whose RFCs are already indexed, may skip this step.
 */
const SKIP_INDICES_FLAG = '--skip-indices'

type Options = {
  skipIndices: boolean
}

const main = async (rfcNumbers: number[], { skipIndices }: Options): Promise<void> => {
  console.log(
    `Processing RFCs ${rfcNumbers.join(', ')}${skipIndices ? ` (${SKIP_INDICES_FLAG})` : ''}. Using ${NUMBER_OF_CONCURRENT_RFC_PROCESSORS} concurrent promises (results may appear out of order).`
  )

  const [rfcUploadTasks, indicesUploadTasks] = await Promise.all([
    PromisePool.for(rfcNumbers).withConcurrency(NUMBER_OF_CONCURRENT_RFC_PROCESSORS).process(processRfcUploadTask),
    skipIndices ? undefined : indices({ api: getApiClient() })
  ])

  if (indicesUploadTasks === undefined) {
    console.log(`[multiple.ts] Indices skipped (${SKIP_INDICES_FLAG}).`)
  } else if (taskItemWasSuccessful(indicesUploadTasks)) {
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

const args = process.argv.slice(2)
const flags = args.filter((arg) => arg.startsWith('--'))
const positionals = args.filter((arg) => !arg.startsWith('--'))

const unknownFlags = flags.filter((flag) => flag !== SKIP_INDICES_FLAG)
if (unknownFlags.length > 0) {
  throw Error(`Unknown flag(s) ${JSON.stringify(unknownFlags)}. The only flag is ${SKIP_INDICES_FLAG}`)
}

if (!positionals[0]) {
  throw Error(`Script requires RFC Numbers arg but argv was ${JSON.stringify(process.argv)}`)
}

const rfcNumbers = positionals[0].split(',').map((rfc) => parseInt(rfc.trim(), 10))
if (rfcNumbers.some((rfcNumber) => Number.isNaN(rfcNumber))) {
  throw Error(`RFC number list ${JSON.stringify(positionals[0])} included a NaN`)
}
main(rfcNumbers, { skipIndices: flags.includes(SKIP_INDICES_FLAG) })
