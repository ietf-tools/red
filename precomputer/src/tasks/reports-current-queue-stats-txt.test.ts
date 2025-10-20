import { vi, test, expect } from 'vitest'
import { renderReportsCurrentQStatsTxt } from './reports-current-queue-stats-txt'

test('renderReportsCurrentQStatsTxt', async () => {
  const date = new Date(2025, 0, 14)
  vi.setSystemTime(date)

  const result = await renderReportsCurrentQStatsTxt()

  // basic sanity check on the response
  expect(result.length).toBeGreaterThan(1000)

  expect(result).toMatchSnapshot()
})
