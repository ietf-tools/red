import path from 'node:path'
import fsPromises from 'node:fs/promises'
import { RFC_INDEX_XSD_PATH, saveToS3 } from '../utilities/s3.ts'
import { type AsyncTaskItem } from '../utilities/task.ts'

const xsdPath = path.resolve(import.meta.dirname, '../assets/rfc-index.xsd')
const xsdFileData = fsPromises.readFile(xsdPath, 'utf-8')

export const uploadRfcIndexXsd = async (): AsyncTaskItem => {
  const xsd = await xsdFileData
  await saveToS3(RFC_INDEX_XSD_PATH, xsd)
  console.log(`[rfc-index.xsd]`, 'Uploaded', RFC_INDEX_XSD_PATH)
  return [RFC_INDEX_XSD_PATH]
}
