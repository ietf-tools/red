import { vi, describe, test, expect } from 'vitest'
import { splitLinesAt, renderRfcIndexTxt } from './rfc-index-txt'
import { testMockAllRfcs } from '../utilities/rfcs-test-data.ts'

const paragraph =
  'Obsoletes xxxx refers to other RFCs that this one replaces; Obsoleted by xxxx refers to RFCs that have replaced this one. Updates xxxx refers to other RFCs that this one merely updates (but does not replace);'

test('splitLinesAt: 40', () => {
  expect(splitLinesAt(paragraph, 40)).toEqual([
    'Obsoletes xxxx refers to other RFCs that',
    'this one replaces; Obsoleted by xxxx',
    'refers to RFCs that have replaced this',
    'one. Updates xxxx refers to other RFCs',
    'that this one merely updates (but does',
    'not replace);'
  ])
})

test('splitLinesAt: 50', () => {
  expect(splitLinesAt(paragraph, 50)).toEqual([
    'Obsoletes xxxx refers to other RFCs that this one',
    'replaces; Obsoleted by xxxx refers to RFCs that',
    'have replaced this one. Updates xxxx refers to',
    'other RFCs that this one merely updates (but does',
    'not replace);'
  ])
})

describe('renderRfcIndexDotTxt', () => {
  test('compare against original 4 digit-wide rendering', async () => {
    const date = new Date(2025, 0, 14)
    vi.setSystemTime(date)

    const str = await renderRfcIndexTxt(testMockAllRfcs, 4)

    // basic sanity check on the response
    expect(str.length).toBeGreaterThan(1000)
    
    expect(str).toMatchSnapshot()
  })

  test('compare against 5 digit-wide rendering (RFC10k)', async () => {
    const date = new Date(2025, 0, 14)
    vi.setSystemTime(date)

    const str = await renderRfcIndexTxt(testMockAllRfcs, 5)

    // basic sanity check on the response
    expect(str.length).toBeGreaterThan(1000)

    expect(str).toMatchSnapshot()
  })
})
