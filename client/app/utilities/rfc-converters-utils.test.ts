// @vitest-environment nuxt
import { test, expect } from 'vitest'

import { parseRfcStatusSlug } from './rfc-converters-utils'

test('parseRfcStatusSlug: bad inputs', () => {
  expect(() => parseRfcStatusSlug('unknown status slug')).toThrow()
  expect(() => parseRfcStatusSlug('')).toThrow()
})

test('parseRfcStatusSlug: good inputs', () => {
  expect(parseRfcStatusSlug('Best Current Practice')).toBe(
    'Best Current Practice'
  )
  expect(parseRfcStatusSlug('best-current-practice')).toBe(
    'Best Current Practice'
  )
  expect(parseRfcStatusSlug('bcp')).toBe('Best Current Practice')
  expect(parseRfcStatusSlug('BCP')).toBe('Best Current Practice')

  expect(parseRfcStatusSlug('experimental')).toBe('Experimental')
  expect(parseRfcStatusSlug('Experimental')).toBe('Experimental')

  expect(parseRfcStatusSlug('historic')).toBe('Historic')
  expect(parseRfcStatusSlug('his')).toBe('Historic')
  expect(parseRfcStatusSlug('Historic')).toBe('Historic')

  expect(parseRfcStatusSlug('informational')).toBe('Informational')
  expect(parseRfcStatusSlug('Informational')).toBe('Informational')
  expect(parseRfcStatusSlug('FYI')).toBe('Informational')

  expect(parseRfcStatusSlug('Not Issued')).toBe('Not Issued')
  expect(parseRfcStatusSlug('Not-Issued')).toBe('Not Issued')
  expect(parseRfcStatusSlug('not issued')).toBe('Not Issued')
  expect(parseRfcStatusSlug('notissued')).toBe('Not Issued')

  expect(parseRfcStatusSlug('Internet Standard')).toBe('Internet Standard')
  expect(parseRfcStatusSlug('Internet-Standard')).toBe('Internet Standard')
  expect(parseRfcStatusSlug('internetstandard')).toBe('Internet Standard')
  expect(parseRfcStatusSlug('Standard')).toBe('Internet Standard')
  expect(parseRfcStatusSlug('std')).toBe('Internet Standard')

  expect(parseRfcStatusSlug('Unknown')).toBe('Unknown')
  expect(parseRfcStatusSlug('unknown')).toBe('Unknown')

  expect(parseRfcStatusSlug('proposed')).toBe('Proposed Standard')
  expect(parseRfcStatusSlug('proposedstandard')).toBe('Proposed Standard')
  expect(parseRfcStatusSlug('proposed-standard')).toBe('Proposed Standard')
  expect(parseRfcStatusSlug('Proposed Standard')).toBe('Proposed Standard')

  expect(parseRfcStatusSlug('draft')).toBe('Draft Standard')
  expect(parseRfcStatusSlug('draftstandard')).toBe('Draft Standard')
})
