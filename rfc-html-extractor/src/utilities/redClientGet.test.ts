// @vitest-environment node
import { test, expect } from 'vitest'
import { sortSubseriesDoc } from './redClientGet'
import { testMockSubseries } from './rfcs-test-data'

test('sortSubseriesDoc', () => {
  expect(
    structuredClone(testMockSubseries)
      .sort(sortSubseriesDoc)
      .map((subseriesDoc) => subseriesDoc.name)
  ).toMatchSnapshot()
})
