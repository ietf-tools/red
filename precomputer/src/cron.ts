import { indices } from './tasks/indices.ts'
import { getApiClient } from './utilities/api.ts'
import { cleanupRedBucket } from './utilities/cleanup.ts'
import { taskItemWasSuccessful } from './utilities/task.ts'

export const main = async (): Promise<void> => {
  console.log('[cron.ts] Running job')
  const api = getApiClient()
  const uploadTasks = await indices({ api })
  if (taskItemWasSuccessful(uploadTasks)) {
    console.log('[cron.ts] Uploads completed.')
  } else {
    console.error(
      '[cron.ts] finished with error(s)' // these errors should be already printed to console
    )
  }

  const didClean = await cleanupRedBucket(uploadTasks.filter((key) => key !== false))

  if (didClean) {
    console.log('[cron.ts] finished successfully')
    process.exit(0)
  } else {
    console.error(
      '[cron.ts] finished with error(s)' // these errors should be already printed to console
    )
    process.exit(1)
  }
}

main()
