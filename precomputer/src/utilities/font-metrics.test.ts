// @vitest-environment node
import { test, expect } from 'vitest'
import { fontMetrics, textWidthEm, unmeasuredCharacters } from './font-metrics.ts'

test('measures text by summing per-character advances', () => {
  const { advanceEm } = fontMetrics.styles.body
  expect(textWidthEm('ab')).toBeCloseTo(advanceEm.a + advanceEm.b, 6)
  expect(textWidthEm('')).toBe(0)
})

test('capitals are wider than lowercase, which is why character count fails', () => {
  // `[QUIC-RECOVERY]` is 15 characters and over 8em; a 15-character lowercase name is not.
  expect(textWidthEm('[QUIC-RECOVERY]')).toBeGreaterThan(8)
  expect(textWidthEm('[quic-recovery]')).toBeLessThan(8)
})

test('monospace advances are uniform', () => {
  expect(textWidthEm('WWWW', 'monospace')).toBeCloseTo(textWidthEm('iiii', 'monospace'), 6)
})

test('bold is wider than body for the same text', () => {
  expect(textWidthEm('Section', 'bold')).toBeGreaterThan(textWidthEm('Section', 'body'))
})

test('an unmeasured character falls back rather than throwing, and is reported', () => {
  const glyph = '\u{1F600}'
  expect(textWidthEm(glyph)).toBeCloseTo(fontMetrics.styles.body.fallbackAdvanceEm, 6)
  expect(unmeasuredCharacters(`a${glyph}b`)).toEqual([glyph])
  expect(unmeasuredCharacters('abc')).toEqual([])
})
