import { rfcToRfcMini } from '../utilities/rfc-converters.ts'
import { RfcMiniIndexSchema, type RfcCommon } from '../../../website/app/utilities/rfc-validators.ts'
import { RFC_MINI_INDEX_JSON_PATH, saveToS3 } from '../utilities/s3.ts'
import { validateDocument } from '../utilities/validate-zod.ts'
import { DateTime } from 'luxon'
import { type AsyncTaskItem } from '../utilities/task.ts'

export const uploadRfcMiniIndexJson = async (allRfcs: Readonly<RfcCommon[]>): AsyncTaskItem => {
  const txt = await renderRfcMiniIndexJson(allRfcs)
  await saveToS3(RFC_MINI_INDEX_JSON_PATH, txt)
  console.log(`[${RFC_MINI_INDEX_JSON_PATH}]`, 'Uploaded', RFC_MINI_INDEX_JSON_PATH)
  return [RFC_MINI_INDEX_JSON_PATH]
}

export const renderRfcMiniIndexJson = async (allRfcs: Readonly<RfcCommon[]>): Promise<string> => {
  let jsonParts: string[] = []

  // This was a .map() callback but that got a 'RangeError: Maximum call stack size exceeded'
  // so it's a simple forloop to avoid callback functions on the stack.
  for (let i = 0; i < allRfcs.length; i++) {
    const rfc = allRfcs[i]
    const rfcMini = rfcToRfcMini(rfc)
    jsonParts.push(JSON.stringify(rfcMini))
  }
  const createdOn = DateTime.now()
  const data = {
    miniIndex: JSON.parse(`[${jsonParts.join(',\n')}]`),
    createdOn: createdOn.toISODate()
  }
  const json = JSON.stringify(data)
  validateDocument(data, RfcMiniIndexSchema)
  return json
}
