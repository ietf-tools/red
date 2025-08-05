// @vitest-environment nuxt
import fs from 'node:fs'
import path from 'node:path'
import { vi, describe, beforeEach, afterEach, test, expect } from 'vitest'
import { renderInNotesRfcRefDotTxt } from './in-notes-rfc-ref-txt'
import { getRedClient } from './redClientWrappers'
import { getTestApiResponses, type DocListResponse } from './rfc.test'
import type {
  ApiClient,
  PaginatedRfcMetadataList
} from '~/generated/red-client'

const inNotesRfcRefs4Digit = fs
  .readFileSync(
    path.join(import.meta.dirname, 'in-notes-rfc-ref-4digit.txt'),
    'utf-8'
  )
  .toString()

const fourDigitRenderingUntilRfc20 = inNotesRfcRefs4Digit
  .substring(
    0,
    inNotesRfcRefs4Digit.indexOf('\n', inNotesRfcRefs4Digit.indexOf('RFC20')) +
      1
  )
  .trimEnd()

const inNotesRfcRefs5Digit = fs
  .readFileSync(
    path.join(import.meta.dirname, 'in-notes-rfc-ref-5digit.txt'),
    'utf-8'
  )
  .toString()

const fiveDigitRenderingUntilRfc20 = inNotesRfcRefs5Digit
  .substring(
    0,
    inNotesRfcRefs5Digit.indexOf('\n', inNotesRfcRefs5Digit.indexOf('RFC20')) +
      1
  )
  .trimEnd()

type TestHelperResponses = {
  oldestRfcResponse: DocListResponse
  seekingResponses: PaginatedRfcMetadataList[]
}

const testHelper = (
  responses: TestHelperResponses,
  longestRfcNumberStringLength: number
) =>
  new Promise<string>((resolve) => {
    const redApiMock = getRedClient()
    type DocListArg = Parameters<ApiClient['red']['docList']>[0]

    // clone so that we don't mutate original array
    const seekingResponses = [...responses.seekingResponses]

    redApiMock.red.docList = (search: DocListArg) =>
      new Promise((resolve) => {
        if (search.sort?.length === 1 && search.sort[0] === '-number') {
          resolve(responses.oldestRfcResponse)
          return
        }
        const nextSeek = seekingResponses.pop()
        if (!nextSeek) {
          resolve(blankRfcResponse)
          return
        }
        resolve(nextSeek)
      })

    let responseTxt = ''
    const push = (str: string) => {
      responseTxt += str
    }

    const close = async () => resolve(responseTxt)

    const abortController = new AbortController()

    ;(async function () {
      await renderInNotesRfcRefDotTxt({
        push,
        close,
        abortController,
        redApi: redApiMock,
        delayBetweenRequestsMs: 0,
        longestRfcNumberStringLength
      })
      resolve(responseTxt)
    })()
  })

describe('renderInNotesRfcRefDotTxt', () => {
  beforeEach(() => {
    // tell vitest we use mocked time
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  afterEach(() => {
    // restoring date after each test run
    vi.useRealTimers()
  })

  test('compare against original 4 digit-wide rendering', async () => {
    const date = new Date(2025, 0, 14)
    vi.setSystemTime(date)

    const str = await testHelper(getTestApiResponses(20), 4)

    // ensure that we read enough of a file
    expect(fourDigitRenderingUntilRfc20.length).toBeGreaterThan(1000)

    // test rendering against a wget of the existing in-notes/rfc-refs.txt truncated to RFC0013
    expect(str.substring(0, fourDigitRenderingUntilRfc20.length)).toEqual(
      fourDigitRenderingUntilRfc20
    )
  })

  test('compare against 5 digit-wide rendering (RFC10k)', async () => {
    const date = new Date(2025, 0, 14)
    vi.setSystemTime(date)

    const testApiResponses = getTestApiResponses(20)
    const str = await testHelper(testApiResponses, 5)

    // ensure that we read enough of a file
    expect(fiveDigitRenderingUntilRfc20.length).toBeGreaterThan(100)

    expect(str.substring(0, fiveDigitRenderingUntilRfc20.length)).toEqual(
      fiveDigitRenderingUntilRfc20
    )
  })
})

const blankRfcResponse: DocListResponse = {
  count: 0,
  results: []
}
