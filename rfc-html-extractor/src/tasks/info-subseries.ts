import { saveToS3, subseriesInfoPathBuilder } from '../utilities/s3.ts'
import { InfoSubseriesItemSchema } from '../../../client/app/utilities/rfc-validators.ts'
import type { InfoSubseriesItem } from '../../../client/app/utilities/rfc-validators.ts'
import { validateDocument } from '../utilities/validate-zod.ts'

const CONSOLE_PURGE_LENGTH = 10

export const uploadAllSubseries = async (
  allSubseries: Readonly<InfoSubseriesItem[]>
): Promise<boolean> => {
  const allSubseriesValidated = await renderAllSubseries(allSubseries)
  const logItems: string[] = []
  console.log(` - subseries 0% (${allSubseriesValidated.length} files)`)
  for (let i = 0; i < allSubseriesValidated.length; i++) {
    const subseriesItem = allSubseriesValidated[i]
    const s3Path = subseriesInfoPathBuilder(subseriesItem.type, subseriesItem.number)
    await saveToS3(
      s3Path,
      JSON.stringify(subseriesItem)
    )
    logItems.push(s3Path)
    if (logItems.length > CONSOLE_PURGE_LENGTH) {
      const logText: string[] = []
      while (logItems.length > 0) {
        const logItem = logItems.pop()
        if (logItem !== undefined) {
          logText.push(logItem)
        }
      }
      console.log(` - subseries ${Math.round( (i / allSubseriesValidated.length) * 100)}% ${logText.join(', ')}.`)
    }
  }

  console.log(` - subseries done (${allSubseriesValidated.length} files)`)
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
