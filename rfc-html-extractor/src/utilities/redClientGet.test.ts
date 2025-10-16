// @vitest-environment node
import { test, expect } from 'vitest'
import { sortInfoSubseriesItem } from './redClientGet'
import { testMockAllSubseries } from './rfcs-test-data'

test('sortInfoSubseriesItem', () => {
  expect(
    structuredClone(testMockAllSubseries)
      .sort(sortInfoSubseriesItem)
      .map((item) => `${item.type}${item.number}`)
  ).toMatchSnapshot()
})
