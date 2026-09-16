import { RfcIndexSchema, type RfcIndex, type RfcCommon } from '../../../website/app/utilities/rfc-validators.ts'
import { RFC_INDEX_JSON_PATH, saveToS3 } from '../utilities/s3.ts'
import { validateDocument } from '../utilities/validate-zod.ts'
import { DateTime } from 'luxon'
import { type AsyncTaskItem } from '../utilities/task.ts'

export const uploadRfcIndexJson = async (allRfcs: Readonly<RfcCommon[]>): AsyncTaskItem => {
  const txt = await renderRfcIndexJson(allRfcs)
  await saveToS3(RFC_INDEX_JSON_PATH, txt)
  console.log(`[${RFC_INDEX_JSON_PATH}]`, 'Uploaded', RFC_INDEX_JSON_PATH)
  return [RFC_INDEX_JSON_PATH]
}

export const renderRfcIndexJson = async (allRfcs: Readonly<RfcCommon[]>): Promise<string> => {
  let rfcs: RfcCommon[] = []

  // A plain loop: a `.map()` callback over 10k+ RFCs overflowed the call stack.
  for (let i = 0; i < allRfcs.length; i++) {
    const rfc: RfcCommon = allRfcs[i]
    rfcs.push(rfc)
  }
  const createdOn = DateTime.now()
  const data: RfcIndex = {
    index: rfcs,
    createdOn: createdOn.toISODate()
  }
  const json = JSON.stringify(data)
  validateDocument(data, RfcIndexSchema)
  return json
}
