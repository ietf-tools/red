import { vi, describe, test, expect } from 'vitest'
import { renderInNotesRfcRefDotTxt } from './in-notes-rfc-ref-txt'
import { testMockAllRfcs } from '../utilities/rfcs-test-data'

describe('renderInNotesRfcRefDotTxt', () => {
  test('compare against original 4 digit-wide rendering', async () => {
    const date = new Date(2025, 0, 14)
    vi.setSystemTime(date)

    const str = await renderInNotesRfcRefDotTxt(testMockAllRfcs, 4)

    // basic sanity check on the response
    expect(str.length).toBeGreaterThan(1000)
    
    expect(str).toMatchSnapshot()
  })

  test('compare against 5 digit-wide rendering (RFC10k)', async () => {
    const date = new Date(2025, 0, 14)
    vi.setSystemTime(date)

    const str = await renderInNotesRfcRefDotTxt(testMockAllRfcs, 5)

    // basic sanity check on the response
    expect(str.length).toBeGreaterThan(1000)

    expect(str).toMatchSnapshot()
  })
})
