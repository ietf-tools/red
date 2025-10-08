import { vi, test, expect } from 'vitest'
import { renderRfcMiniIndexJson } from './rfc-mini-index-json.ts'
import { testMockAllRfcs } from '../utilities/rfcs-test-data.ts'

test('renderRfcMiniIndexJson', async () => {
  const date = new Date(2025, 0, 14)
  vi.setSystemTime(date)

  const str = await renderRfcMiniIndexJson(testMockAllRfcs)

  // basic sanity check on the response
  expect(str.length).toBeGreaterThan(1000)

  expect(str).toMatchSnapshot()
})
