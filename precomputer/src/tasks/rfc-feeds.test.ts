// @vitest-environment node
import { test, beforeEach, afterEach, expect, vi } from 'vitest'
import { renderFeeds } from './rfc-feeds.ts'
import { testMockAllRfcs } from '../utilities/rfcs-test-data.ts'

test('feeds (rss, atom)', async () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const date = new Date(2030, 1, 1)
  vi.setSystemTime(date)

  const { atom1, rss2 } = await renderFeeds(testMockAllRfcs)
  expect(atom1).toMatchSnapshot()
  expect(rss2).toMatchSnapshot()
})
