
import path from 'node:path'
import fsPromises from 'node:fs/promises'
import { RFC_INDEX_XSD_PATH, saveToS3 } from '../utilities/s3.ts'

const xsdPath = path.resolve(import.meta.dirname, '../assets/rfc-index.xsd')
const xsdFileData = fsPromises.readFile(xsdPath, 'utf-8')

export const uploadRfcIndexXsd = async () => {
  const xsd = await xsdFileData
  await saveToS3(RFC_INDEX_XSD_PATH, xsd)
}