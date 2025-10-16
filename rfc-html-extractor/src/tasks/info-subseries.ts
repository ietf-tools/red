import { saveToS3, subseriesInfoPathBuilder } from '../utilities/s3.ts'
import { InfoSubseriesItemSchema } from '../../../client/app/utilities/rfc-validators.ts'
import type { InfoSubseriesItem } from '../../../client/app/utilities/rfc-validators.ts'
import { validateDocument } from '../utilities/validate-zod.ts'

export const uploadAllSubseries = async (
  allSubseries: Readonly<InfoSubseriesItem[]>
): Promise<boolean> => {
  const allSubseriesValidated = await renderAllSubseries(allSubseries)
  for (let i = 0; i < allSubseriesValidated.length; i++) {
    const subseriesItem = allSubseriesValidated[i]
    await saveToS3(
      subseriesInfoPathBuilder(subseriesItem.type, subseriesItem.number),
      JSON.stringify(subseriesItem)
    )
  }
  console.log(`Uploaded subseries (${allSubseriesValidated.length} files)`)
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
