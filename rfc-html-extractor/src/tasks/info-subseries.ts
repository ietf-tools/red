import { PromisePool } from '@supercharge/promise-pool'
import { saveToS3, subseriesInfoPathBuilder } from '../utilities/s3.ts'
import { InfoSubseriesItemSchema } from '../../../client/app/utilities/rfc-validators.ts'
import type { InfoSubseriesItem } from '../../../client/app/utilities/rfc-validators.ts'
import { validateDocument } from '../utilities/validate-zod.ts'

const CONSOLE_PURGE_LENGTH = 10
const NUMBER_OF_SIMULTANEOUS_S3_UPLOADS = 4

export const uploadAllSubseries = async (
  allSubseries: Readonly<InfoSubseriesItem[]>
): Promise<boolean> => {
  const allSubseriesValidated = await renderAllSubseries(allSubseries)
  const logItems: string[] = []

  const { results, errors } = await PromisePool.for(allSubseriesValidated)
    .withConcurrency(NUMBER_OF_SIMULTANEOUS_S3_UPLOADS)
    .onTaskFinished((_item, pool) => {
      if (logItems.length > CONSOLE_PURGE_LENGTH) {
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
    validateDocument(subseriesItem, InfoSubseriesItemSchema)
    return subseriesItem
  })
}
