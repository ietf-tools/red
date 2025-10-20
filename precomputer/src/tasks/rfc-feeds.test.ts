// @vitest-environment node
import { test, expect } from 'vitest'
import { renderFeeds } from './rfc-feeds.ts'
import { testMockAllRfcs } from '../utilities/rfcs-test-data.ts'

test('feeds (rss, atom)', async () => {
  const { atom1, rss2 } = await renderFeeds(testMockAllRfcs)
  expect(atom1).toMatchSnapshot()
  expect(rss2).toMatchSnapshot()
})
