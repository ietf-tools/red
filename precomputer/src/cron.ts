import { indices } from './tasks/indices.ts'
import { getApiClient } from './utilities/api.ts'

export const main = async (): Promise<void> => {
  console.log('Running cron job')
  const api = getApiClient()
  const isSuccessful = await indices({ api })
  if (!isSuccessful) {
    console.error(
      'cron.ts finished with error(s)' // these errors should be already printed to console
    )
    process.exit(1)
  }

  console.log('cron.ts finished successfully')
  process.exit(0)
}

main()
