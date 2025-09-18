// @vitest-environment node
import { test, expect } from 'vitest'
import { renderHomepageLatest } from './homepage-latest.ts'
import { testMockAllRfcs } from '../utilities/rfcs-test-data.ts'

test('homepage 3 items', async () => {
  const response = await renderHomepageLatest(testMockAllRfcs)
  expect(response).toMatchSnapshot()
  expect(response.homepageLatest.length).toBe(3)
})
