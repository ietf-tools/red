import { PromisePool } from '@supercharge/promise-pool'
import { DateTime } from 'luxon'
import { saveToS3, subseriesInfoPathBuilder, subseriesIndexJsonPathBuilder } from '../utilities/s3.ts'
import { SubseriesCommonSchema, SubseriesIndexSchema } from '../../../website/app/utilities/rfc-validators.ts'
import type { SubseriesCommon, SubseriesIndex } from '../../../website/app/utilities/rfc-validators.ts'
import { validateDocument } from '../utilities/validate-zod.ts'
import { type AsyncTaskItem } from '../utilities/task.ts'

const CONSOLE_PURGE_LENGTH = 10
const NUMBER_OF_CONCURRENT_SUBSERIES_S3_UPLOADS = 4

export const uploadAllSubseries = async (allSubseries: Readonly<SubseriesCommon[]>): AsyncTaskItem => {
  const allSubseriesValidated = await renderAllSubseries(allSubseries)
  const logItems: string[] = []

  const { results: resultsArray, errors } = await PromisePool.for(allSubseriesValidated)
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
        const percent = Math.round((pool.processedCount() / allSubseriesValidated.length) * 100)
        console.log(`[subseries] ${percent}% ${logText.join(', ')}.`)
      }
    })
    .process(async (subseriesItem, i): AsyncTaskItem => {
      const s3Path = subseriesInfoPathBuilder(subseriesItem.type, subseriesItem.number)
      await saveToS3(s3Path, JSON.stringify(subseriesItem))
      logItems.push(s3Path)
      return [s3Path]
    })

  // print any remaining log items
  console.log(` - subseries 100% ${logItems.length > 0 ? `${logItems.join(', ')}.` : ''}`)

  if (errors.length > 0) {
    console.error(` - subseries error ${errors}`)
  } else {
    console.log(` - subseries done (${allSubseriesValidated.length} files)`)
  }

  return resultsArray.flat()
}

export const renderAllSubseries = async (allSubseries: Readonly<SubseriesCommon[]>): Promise<SubseriesCommon[]> => {
  return allSubseries.map((subseriesItem) => {
    // subseries are already in a data format we can use, so just validate it
    validateDocument(subseriesItem, SubseriesCommonSchema)
    return subseriesItem
  })
}

const SUBSERIES_TYPES = ['bcp', 'fyi', 'std'] as const satisfies SubseriesCommon['type'][]

export const uploadSubseriesIndexJsons = async (allSubseries: Readonly<SubseriesCommon[]>): AsyncTaskItem => {
  const paths = await Promise.all(
    SUBSERIES_TYPES.map(async (type) => {
      const subseriesIndex = await renderSubseriesIndexJson(type, allSubseries)
      const s3Path = subseriesIndexJsonPathBuilder(type)
      await saveToS3(s3Path, JSON.stringify(subseriesIndex))
      console.log(`[${s3Path}]`, 'Uploaded', s3Path)
      return s3Path
    })
  )
  return paths
}

export const renderSubseriesIndexJson = async (
  type: SubseriesCommon['type'],
  allSubseries: Readonly<SubseriesCommon[]>
): Promise<SubseriesIndex> => {
  // Only the required fields of RfcCommon are kept, to keep the index small.
  const slimRfc = (rfc: SubseriesCommon['contents'][number]): SubseriesCommon['contents'][number] => {
    const { number, title, status, stream, authors, formats } = rfc
    return {
      number,
      title,
      status,
      stream: { slug: stream.slug, name: stream.name },
      authors: authors.map(({ titlepage_name }) => ({ titlepage_name })),
      formats: formats.map(({ format }) => ({ format }))
    }
  }

  const data: SubseriesIndex = {
    createdOn: DateTime.now().toISODate(),
    index: allSubseries
      .filter((subseriesItem) => subseriesItem.type === type)
      .map((subseriesItem) => ({ ...subseriesItem, contents: subseriesItem.contents.map(slimRfc) }))
  }
  validateDocument(data, SubseriesIndexSchema)
  return data
}
