// @vitest-environment node
import fsPromises from 'node:fs/promises'
import { test, expect } from 'vitest'
import { getRedClient, sortInfoSubseriesItem } from './redClientGet'
import { testMockAllSubseries } from './rfcs-test-data'
import { parseStatus, getAllRFCs, getAllSubseries } from './redClientGet'
import type { DocListArg } from './redClientGet'
import { RfcCommonStatusSchema } from '../../../website/app/utilities/rfc-validators'

test('sortInfoSubseriesItem', () => {
  expect(
    structuredClone(testMockAllSubseries)
      .sort(sortInfoSubseriesItem)
      .map((item) => `${item.type}${item.number}`)
  ).toMatchSnapshot()
})

test('parseStatusSlug: bad inputs', () => {
  expect(() =>
    parseStatus(
      // invalid mismatch of slug and name
      { slug: 'experimental', name: 'best current practice' }
    )
  ).toThrow()

  expect(() =>
    parseStatus({
      // unexpected name casing
      slug: 'experimental',
      name: 'Experimental'
    })
  ).toThrow()
})

test('parseStatusSlug: good inputs', () => {
  expect(
    parseStatus({ slug: 'bcp', name: 'best current practice' })
  ).toStrictEqual({
    slug: 'bcp',
    name: 'best current practice'
  })

  expect(
    parseStatus({ slug: 'experimental', name: 'experimental' })
  ).toStrictEqual({
    slug: 'experimental',
    name: 'experimental'
  })

  expect(parseStatus({ slug: 'historic', name: 'historic' })).toStrictEqual({
    slug: 'historic',
    name: 'historic'
  })

  expect(
    parseStatus({ slug: 'informational', name: 'informational' })
  ).toStrictEqual({
    slug: 'informational',
    name: 'informational'
  })

  expect(parseStatus({ slug: 'not-issued', name: 'not issued' })).toStrictEqual(
    {
      slug: 'not-issued',
      name: 'not issued'
    }
  )

  expect(parseStatus({ slug: 'unknown', name: 'unknown' })).toStrictEqual({
    slug: 'unknown',
    name: 'unknown'
  })
})

test.skip(
  'test status parsing against all RFCs',
  { timeout: 300_000 },
  async () => {
    const api = getRedClient()

    const docListArg: DocListArg = {}
    docListArg.sort = ['-number'] // we start at the most recent RFC and walk back to RFC 1
    let offset = 0 // offset is API database row offset, not an RFC number offset
    const MAX_LIMIT_PER_REQUEST = 100
    let hasFoundRfc1 = false
    while (!hasFoundRfc1) {
      docListArg.offset = offset
      docListArg.limit = MAX_LIMIT_PER_REQUEST
      const response = await api.red.docList(docListArg)
      response.results.forEach((rfcMetadata) => {
        const { data, error } = RfcCommonStatusSchema.safeParse(
          rfcMetadata.status
        )
        expect(
          error,
          `Invalid status ${JSON.stringify(rfcMetadata.status)}`
        ).toBeUndefined()
        expect(
          data,
          `Invalid status ${JSON.stringify(rfcMetadata.status)}`
        ).toBeTruthy()
        if (hasFoundRfc1 === false && rfcMetadata.number === 1) {
          hasFoundRfc1 = true
        }
      })
      offset += response.results.length
    }
  }
)

// test('Regenerate test data', { timeout: 300_000 }, async () => {
//   const api = getRedClient()
//   const [ allRfcs, allSubseries ] = await Promise.all([
//     getAllRFCs({ api }),
//     getAllSubseries({ api })
//   ])
//   const rfcsToRender: number[] = [298, 9804, 9049]
//   const someRfcs = allRfcs.filter(rfc => rfcsToRender.includes(rfc.number) || rfc.number % 1000 < 50)
//   const someSubseries = allSubseries.filter(subseries => subseries.number % 10 < 5)
//   await fsPromises.writeFile('/tmp/test-data-rfcs.json', `[\n  ${someRfcs.map(rfc => JSON.stringify(rfc)).join(',\n  ')}\n]`)
//   await fsPromises.writeFile('/tmp/test-data-subseries.json', `[\n  ${someSubseries.map(rfc => JSON.stringify(rfc)).join(',\n  ')}\n]`)
// })
