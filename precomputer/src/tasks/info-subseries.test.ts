import { vi, test, expect } from 'vitest'
import { renderSubseriesIndexJson } from './info-subseries.ts'
import { SubseriesIndexSchema } from '../../../website/app/utilities/rfc-validators.ts'
import { testMockAllSubseries } from '../utilities/rfcs-test-data.ts'

test('renderSubseriesIndexJson', async () => {
  vi.setSystemTime(new Date(2025, 0, 14))
  const subseriesIndex = await renderSubseriesIndexJson('bcp', testMockAllSubseries)

  const { index } = SubseriesIndexSchema.parse(subseriesIndex)

  expect(index.length).toBeGreaterThan(0)
  expect(index.every(({ type }) => type === 'bcp')).toBe(true)
  expect(index.flatMap(({ contents }) => contents).every((rfc) => rfc.abstract === undefined)).toBe(true)
  expect(subseriesIndex).toMatchSnapshot()
})
