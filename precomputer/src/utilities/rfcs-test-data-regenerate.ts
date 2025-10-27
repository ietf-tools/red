import fsPromises from 'node:fs/promises'
import path from 'node:path'
import { getAllRFCs, getAllSubseries, getRedClient } from './redClientGet.ts'

/**
 * Nothing is exported from this function because it's a Node script utility that regenerates test data.
 * I thought it better to colocate the file with the data it generates rather than put it in a `scripts`
 * directory so that's why it's here in `utilities`.
 */

const regenerateTestData = async () => {
  const api = getRedClient()
  const [allRfcs, allSubseries] = await Promise.all([
    getAllRFCs({ api }),
    getAllSubseries({ api })
  ])

  // these RFCs are interesting test cases
  const rfcsByNumberToInclude: number[] = [298, 9804, 9049]
  const someRfcs = allRfcs.filter(
    (rfc) =>
      rfcsByNumberToInclude.includes(rfc.number) ||
      /// get a test subset of RFCs across the whole series that hopefully represent metadata variations from different epochs
      rfc.number % 1000 < 50
  )

  const someSubseries = allSubseries.filter(
    (subseries) => subseries.number % 10 < 5
  )

  const warning = `// THIS FILE IS AUTO GENERATED. DO NOT EDIT.\n// Use \`npm run regenerate-test-data\` to update.\n`
  const fileHeader = `${warning}\nimport type { RfcCommon, InfoSubseriesItem } from '../../../website/app/utilities/rfc-validators.ts'\n`
  const rfcsTypeScriptString = `export const testMockAllRfcs: RfcCommon[] = [\n  ${someRfcs.map((rfc) => JSON.stringify(rfc)).join(',\n  ')}\n]`
  const subseriesTypeScriptString = `export const testMockAllSubseries: InfoSubseriesItem[] = [\n  ${someSubseries.map((rfc) => JSON.stringify(rfc)).join(',\n  ')}\n]`
  const footer = `${warning}`
  const data = `${fileHeader}\n${rfcsTypeScriptString}\n\n${subseriesTypeScriptString}\n${footer}`

  const rfcsTestDataPath = path.join(import.meta.dirname, './rfcs-test-data.ts')
  console.log(`Writing to ${JSON.stringify(rfcsTestDataPath)}`)
  await fsPromises.writeFile(rfcsTestDataPath, data)
}

regenerateTestData()