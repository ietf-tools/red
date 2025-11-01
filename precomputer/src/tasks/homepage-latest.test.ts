// @vitest-environment node
import { test, expect, vi } from 'vitest'
import { renderHomepageLatest } from './homepage-latest.ts'
import { testMockAllRfcs } from '../utilities/rfcs-test-data.ts'

test('homepage latest RFCs', async () => {
  const date = new Date(2025, 0, 14)
  vi.setSystemTime(date)  
  const response = await renderHomepageLatest(testMockAllRfcs)
  expect(response).toMatchSnapshot()
  expect(response.homepageLatest.length).toBe(3)
})
