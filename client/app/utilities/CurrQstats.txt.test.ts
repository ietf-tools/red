// @vitest-environment nuxt
import fs from 'node:fs'
import path from 'node:path'
import { vi, test, expect } from 'vitest'
import { renderCurrQstatsDotTxt } from './CurrQstats-txt'
import { getRedClient } from '~/utilities/redClientWrappers'

const currQStatsTxt = fs
  .readFileSync(path.join(import.meta.dirname, 'CurrQstats.txt'), 'utf-8')
  .toString()

// FIXME: actually use an API
export type TestHelperResponses = {
  queueSummaryResponse: {
    results: {
      state: string
      totalDocs: number
      totalPages: number
      medianWeeksInState: number
      averageWeeksInState: number
    }[]
    stats: {
      totalDocs: number
      totalPages: number
    }
  }
}

const testHelper = async (): Promise<string> => {
  const redApiMock = getRedClient()

  /*
    FIXME: update when API is available
    redApiMock.red.currQstatsAPI = () =>
      new Promise((resolve) => { })
    */

  return renderCurrQstatsDotTxt({
    redApi: redApiMock
  })
}

test('CurrQstats.txt: compare against original rendering', async () => {
  const date = new Date(2025, 0, 14)
  vi.setSystemTime(date)

  expect(currQStatsTxt.length).toBeGreaterThan(100)

  const result = await testHelper()

  // test rendering against a wget of the existing CurrQstats.txt
  expect(result).toEqual(currQStatsTxt)
})
