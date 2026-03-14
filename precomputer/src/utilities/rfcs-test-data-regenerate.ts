import fsPromises from 'node:fs/promises'
import path from 'node:path'
import { getAllRFCs, getAllSubseries, getApiClient } from './api.ts'
import { ErrataListSchema } from '../../../website/app/utilities/rfc-validators.ts'

/**
 * Nothing is exported from this file because it's a Node script utility that regenerates test data.
 *
 * I thought it better to colocate the file with the data it generates rather than put it in a `scripts` directory.
 */

const errataJsonPath = path.resolve(
  import.meta.dirname,
  '..',
  'old-rfc-editor.org',
  'errata.json'
)

const regenerateTestData = async () => {
  const api = getApiClient()
  const [allRfcs, allSubseries, errataBuffer] = await Promise.all([
    getAllRFCs({ api }),
    getAllSubseries({ api }),
    fsPromises.readFile(errataJsonPath)
  ])

  const decoder = new TextDecoder()
  const errataJson = decoder.decode(errataBuffer)
  const unverifiedErrataList = JSON.parse(errataJson)
  const errataList = ErrataListSchema.parse(unverifiedErrataList)

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

  const someErrataList = errataList.filter((errataItem) => {
    const rfcNumber = parseInt(errataItem['doc-id'].replace(/[A-Z]/g, ''), 10)
    return rfcNumber % 100 < 5
  })

  const warning = `// THIS FILE IS AUTO GENERATED. DO NOT EDIT.\n// Use \`npm run generate:test-data\` to update.\n`
  const fileHeader = `${warning}\nimport type { RfcCommon, SubseriesCommon, ErrataList } from '../../../website/app/utilities/rfc-validators.ts'\n`
  const rfcsTypeScriptString = `export const testMockAllRfcs: RfcCommon[] = [\n  ${someRfcs.map((rfc) => JSON.stringify(rfc)).join(',\n  ')}\n]`
  const subseriesTypeScriptString = `export const testMockAllSubseries: SubseriesCommon[] = [\n  ${someSubseries.map((rfc) => JSON.stringify(rfc)).join(',\n  ')}\n]`
  const errataListTypeScriptString = `export const testMockErrataList: ErrataList = [\n  ${someErrataList.map((errataItem) => JSON.stringify(errataItem)).join(',\n  ')}\n]`

  const footer = `${warning}`
  const data = `${fileHeader}\n${rfcsTypeScriptString}\n\n${subseriesTypeScriptString}\n\n${errataListTypeScriptString}\n${footer}`

  const rfcsTestDataPath = path.join(import.meta.dirname, './rfcs-test-data.ts')
  console.log(`Writing to ${JSON.stringify(rfcsTestDataPath)}`)
  await fsPromises.writeFile(rfcsTestDataPath, data)
}

regenerateTestData()
