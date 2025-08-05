// @vitest-environment nuxt
import { vi, test, expect, describe, beforeEach, afterEach } from 'vitest'
import { DateTime } from 'luxon'
import { parseRFCId } from './rfc'
import { NONBREAKING_SPACE } from './strings'
import rfcRefs from './rfc-refs.json'
import rfcJsons from './rfc-jsons.json'
import { FIXME_getRFCWithMissingData } from './rfc.mocks'
import { testRFCDocListResponse } from './doc-list-all.mocks'
import { rfcToRfcJSON } from './rfc-converters'
import {
  formatDatePublished,
  parseRfcJsonPubDateToISO
} from './rfc-converters-utils'
import { refsRefRfcIdTxt } from './refs'
import type { ApiClient, Rfc, RfcMetadata } from '~/generated/red-client'

test('parseRFCId', () => {
  expect(parseRFCId('rfc1234')).toEqual({
    type: 'RFC',
    number: '1234'
  })

  expect(parseRFCId('rfc1234bub')).toEqual({
    type: 'RFC',
    number: '1234',
    title: 'bub'
  })

  expect(parseRFCId(`rfc${NONBREAKING_SPACE}1234`)).toEqual({
    type: 'RFC',
    number: '1234'
  })
})

export type DocListResponse = Awaited<ReturnType<ApiClient['red']['docList']>>

type TestApiResponses = {
  oldestRfcResponse: DocListResponse
  seekingResponses: DocListResponse[]
}

export const getTestApiResponses = (
  untilRfcNumber: number
): TestApiResponses => {
  const entireDocListResponse = structuredClone(testRFCDocListResponse)

  const truncatedDocListResponse = {
    ...entireDocListResponse,
    results: entireDocListResponse.results
      .filter((rfcMetadata) => rfcMetadata.number <= untilRfcNumber)
      .sort((a, b) => a.number - b.number)
  }

  const oldestRfcResponse: DocListResponse = {
    count: truncatedDocListResponse.results.length,
    next: null,
    previous: null,
    results: [
      truncatedDocListResponse.results[
        truncatedDocListResponse.results.length - 1 // last result
      ]
    ]
  }

  const PAGING_SIZE = 20

  const seekingResponses = truncatedDocListResponse.results.reduce(
    (acc, _result, index) => {
      if (index % PAGING_SIZE === 0) {
        // add a new page
        acc.push({
          count: truncatedDocListResponse.results.length,
          next: null,
          previous: null,
          results: truncatedDocListResponse.results.slice(
            index,
            index + PAGING_SIZE
          )
        })
      }
      return acc
    },
    [] as DocListResponse[]
  )

  return {
    oldestRfcResponse,
    seekingResponses
  }
}

export const blankRfcResponse: DocListResponse = {
  count: 0,
  results: []
}

const rfcMetadataToRfc = (rfcMetadata: RfcMetadata): Rfc => ({
  ...rfcMetadata,
  text: ''
})

test('refsRefRfcIdTxt', () => {
  expect(rfcRefs.snapshots.length).toBeGreaterThan(10)

  rfcRefs.snapshots
    .filter((snapshot) => {
      const filename = snapshot[0]
      const rfcId = parseRFCId(filename)
      // FIXME: enable greater range of RFC comparison tests
      return parseFloat(rfcId.number) < 14
    })
    .forEach((snapshot) => {
      const filename = snapshot[0]
      const originalResult = snapshot[1]
      const expectedResult = originalResult.replace(/>\.\n$/, '/>.\n') // expectedResult is same as originalResult except the url has a trailing slash

      const filenameMatches = filename.match(/^ref([0-9]+)\.txt$/)

      if (!filenameMatches) {
        throw Error(`Unable to parse filename ${filename}`)
      }

      const rfcNumberString = filenameMatches[1]
      const rfcNumber = parseInt(rfcNumberString, 10)

      const rfcMetadata = testRFCDocListResponse.results.find(
        (rfcMetadata) => rfcMetadata.number === rfcNumber
      )

      if (!rfcMetadata) {
        throw Error(
          `Couldn't find RFC ${rfcNumber} in twoDigitRFCDocListResponse.results`
        )
      }

      const rfc: Rfc = rfcMetadataToRfc(rfcMetadata)

      expect(refsRefRfcIdTxt(rfc)).toEqual(expectedResult)
    })
})

test('rfcToRfcJSON', () => {
  expect(rfcJsons.snapshots.length).toBeGreaterThan(10)

  rfcJsons.snapshots
    .filter((snapshot) => {
      const filename = snapshot[0].toString()
      const rfcId = parseRFCId(filename)
      // FIXME: enable greater range of RFC comparison tests
      return parseFloat(rfcId.number) < 14
    })
    .forEach((snapshot) => {
      const filename = snapshot[0].toString()
      const expectedResult = snapshot[1]
      if (
        // used to narrow TS type in following code
        typeof expectedResult === 'string'
      ) {
        throw Error('Expected object not string')
      }

      const filenameMatches = filename.match(/^rfc([0-9]+)\.json$/)

      if (!filenameMatches) {
        throw Error(`Unable to parse filename ${filename}`)
      }

      const rfcNumberString = filenameMatches[1]
      const rfcNumber = parseInt(rfcNumberString, 10)

      const removeLeadingZeros = (rfcId: string): string =>
        `RFC${parseRFCId(rfcId).number}`

      const normalizeUrlWithRfcNumber = (url: string | null): string | null => {
        if (!url) return null
        const withoutLeadingZeros = url.replace(/rfc[0]+/g, 'rfc')
        return `${withoutLeadingZeros}/`
      }

      /**
       * These JSONs have some things we'd like to change...
       */
      const normalisedExpectedResult = {
        ...expectedResult,
        doc_id: removeLeadingZeros(expectedResult.doc_id),
        keywords: expectedResult.keywords // filter 'keywords' array items that are just whitespace
          .filter((keyword) => keyword.trim()),
        obsoleted_by: expectedResult.obsoleted_by.map((obsoleted_by_item) =>
          removeLeadingZeros(obsoleted_by_item.trim())
        ),
        obsoletes: expectedResult.obsoletes.map((obsoletes_item) =>
          removeLeadingZeros(obsoletes_item.trim())
        ),
        updated_by: expectedResult.updated_by.map((updated_by_item) =>
          removeLeadingZeros(updated_by_item.trim())
        ),
        errata_url: normalizeUrlWithRfcNumber(expectedResult.errata_url),
        title: expectedResult.title.trim(), // remove spaces on either end of 'title'
        abstract: expectedResult.abstract?.trim() // remove spaces on either end of 'abstract'
      }

      const rfcMetadata = testRFCDocListResponse.results.find(
        (rfcMetadata) => rfcMetadata.number === rfcNumber
      )

      if (!rfcMetadata) {
        throw Error(
          `Couldn't find RFC ${rfcNumber} in twoDigitRFCDocListResponse.results`
        )
      }

      const rfc: Rfc = FIXME_getRFCWithMissingData(
        rfcMetadataToRfc(rfcMetadata)
      )

      expect(rfcToRfcJSON(rfc), `RFC ${rfcNumber} comparison`).toEqual(
        normalisedExpectedResult
      )
    })
})

test('formatDatePublished', () => {
  const jan1 = DateTime.fromObject({ year: 2025, month: 1, day: 1 })
  const april1 = DateTime.fromObject({ year: 2025, month: 4, day: 1 })

  expect(formatDatePublished(jan1, false)).toBe('January 2025')
  expect(formatDatePublished(jan1, true)).toBe('January 2025')

  expect(formatDatePublished(april1, false)).toBe('April 2025')
  expect(formatDatePublished(april1, true)).toBe('1 April 2025')
})

describe('parseRfcJsonPubDateToISO', () => {
  beforeEach(() => {
    // tell vitest we use mocked time
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  afterEach(() => {
    // restoring date after each test run
    vi.useRealTimers()
  })

  test('parseRfcJsonPubDateToISO', () => {
    const date = new Date(2025, 0, 14)
    vi.setSystemTime(date)

    expect(parseRfcJsonPubDateToISO('January 2025')).toBe(
      '2025-01-01T00:00:00.000+00:00'
    )
    expect(parseRfcJsonPubDateToISO('1 January 2025')).toBe(
      '2025-01-01T00:00:00.000+00:00'
    )

    expect(parseRfcJsonPubDateToISO('1 April 2025')).toBe(
      '2025-04-01T00:00:00.000+00:00'
    )
    expect(parseRfcJsonPubDateToISO('April 2025')).toBe(
      '2025-04-01T00:00:00.000+00:00'
    )
  })
})
