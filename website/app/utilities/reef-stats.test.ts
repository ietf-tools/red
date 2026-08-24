// @vitest-environment nuxt
import { describe, expect, test, vi } from 'vitest'

import { documentStatsToReefStats, parseDocumentStats, statsDocumentKey } from './reef-stats'

const row = {
  doc: 'rfc9110',
  rating_average: 4.25,
  rating_count: 12,
  subscriber_count: 340,
  set_count: 7
}

describe('statsDocumentKey', () => {
  test('is the compact identifier Reef canonicalizes to', () => {
    expect(statsDocumentKey(9110)).toBe('rfc9110')
  })
})

describe('documentStatsToReefStats', () => {
  test('maps a row onto the shape the components render', () => {
    expect(documentStatsToReefStats(row)).toEqual({
      ratingAggregate: { average: 4.25, count: 12 },
      subscriberCount: 340,
      setCount: 7
    })
  })

  test('reads a null average as no average, which is what an unrated RFC gets', () => {
    const { ratingAggregate } = documentStatsToReefStats({ ...row, rating_average: null, rating_count: 0 })
    expect(ratingAggregate).toEqual({ average: undefined, count: 0 })
  })

  test('keeps zeros, which Reef sends for a document with no engagement at all', () => {
    expect(
      documentStatsToReefStats({ ...row, rating_average: null, rating_count: 0, subscriber_count: 0, set_count: 0 })
    ).toEqual({
      ratingAggregate: { average: undefined, count: 0 },
      subscriberCount: 0,
      setCount: 0
    })
  })
})

describe('parseDocumentStats', () => {
  test('takes the row from a response naming the one document asked for', () => {
    expect(parseDocumentStats([row])).toEqual(documentStatsToReefStats(row))
  })

  test('takes the first row, without checking which document it names', () => {
    // Reef canonicalizes identifiers, so disagreeing with it about the spelling is not a reason to
    // discard the numbers it sent for the document that was requested.
    expect(parseDocumentStats([{ ...row, doc: 'RFC 9110' }])).toEqual(documentStatsToReefStats(row))
  })

  test('is undefined rather than throwing for anything that is not a row of numbers', () => {
    // Each of these has to come out as no numbers: this runs inside SSR, where a throw would take
    // the RFC page with it.
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(parseDocumentStats([])).toBeUndefined()
    expect(parseDocumentStats(undefined)).toBeUndefined()
    expect(parseDocumentStats(null)).toBeUndefined()
    expect(parseDocumentStats(row)).toBeUndefined()
    expect(parseDocumentStats([{ ...row, rating_count: '12' }])).toBeUndefined()
    expect(parseDocumentStats([{ doc: 'rfc9110' }])).toBeUndefined()
    warn.mockRestore()
  })
})
