import { PromisePool } from '@supercharge/promise-pool'
import { saveToS3, subseriesInfoPathBuilder } from '../utilities/s3.ts'
import { InfoSubseriesItemSchema } from '../../../client/app/utilities/rfc-validators.ts'
import type { InfoSubseriesItem } from '../../../client/app/utilities/rfc-validators.ts'
import { validateDocument } from '../utilities/validate-zod.ts'

const CONSOLE_PURGE_LENGTH = 10
const NUMBER_OF_CONCURRENT_SUBSERIES_S3_UPLOADS = 4

export const uploadAllSubseries = async (
  allSubseries: Readonly<InfoSubseriesItem[]>
): Promise<boolean> => {
  const allSubseriesValidated = await renderAllSubseries(allSubseries)
  const logItems: string[] = []

  const { results, errors } = await PromisePool.for(allSubseriesValidated)
    .withConcurrency(NUMBER_OF_CONCURRENT_SUBSERIES_S3_UPLOADS)
    .onTaskFinished((_item, pool) => {
      if (
        // to avoid spamming the console with updates we'll accumulate logItems until a threshold and then print them
        logItems.length > CONSOLE_PURGE_LENGTH
      ) {
        const logText: string[] = []
        while (logItems.length > 0) {
          const logItem = logItems.pop()
          if (logItem !== undefined) {
            logText.push(logItem)
          }
        }
        const percent = Math.round(
          (pool.processedCount() / allSubseriesValidated.length) * 100
        )
        console.log(` - subseries ${percent}% ${logText.join(', ')}.`)
      }
    })
    .process(async (subseriesItem, i) => {
      const s3Path = subseriesInfoPathBuilder(
        subseriesItem.type,
        subseriesItem.number
      )
      await saveToS3(s3Path, JSON.stringify(subseriesItem))
      logItems.push(s3Path)
      return true
    })

  console.log(
    ` - subseries 100% ${
      logItems.length > 0
        ? // print any remaining log items
          `${logItems.join(', ')}.`
        : ''
    }`
  )

  if (results.some((result) => result !== true) || errors.length > 0) {
    console.error(` - subseries error ${errors}`)
  } else {
    console.log(` - subseries done (${allSubseriesValidated.length} files)`)
  }

  return true
}

export const renderAllSubseries = async (
  allSubseries: Readonly<InfoSubseriesItem[]>
): Promise<InfoSubseriesItem[]> => {
  return allSubseries.map((subseriesItem) => {
    // subseries are already in a data format we can use, so just validate it
    validateDocument(subseriesItem, InfoSubseriesItemSchema)
    return subseriesItem
  })
}
