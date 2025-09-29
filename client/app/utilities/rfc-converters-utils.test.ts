// @vitest-environment nuxt
import { test, expect } from 'vitest'

import { parseRfcStatusSlug } from './rfc-converter-parse'

test('parseRfcStatusSlug: bad inputs', () => {
  expect(() => parseRfcStatusSlug('unknown status slug')).toThrow()
  expect(() => parseRfcStatusSlug('')).toThrow()
})

test('parseRfcStatusSlug: good inputs', () => {
  expect(parseRfcStatusSlug('Best Current Practice')).toStrictEqual({
    slug: 'bcp',
    name: 'Best Current Practice'
  })
  expect(parseRfcStatusSlug('best-current-practice')).toStrictEqual({
    slug: 'bcp',
    name: 'Best Current Practice'
  })
  expect(parseRfcStatusSlug('bcp')).toStrictEqual({
    slug: 'bcp',
    name: 'Best Current Practice'
  })
  expect(parseRfcStatusSlug('BCP')).toStrictEqual({
    slug: 'bcp',
    name: 'Best Current Practice'
  })

  expect(parseRfcStatusSlug('experimental')).toStrictEqual({
    slug: 'experimental',
    name: 'Experimental'
  })
  expect(parseRfcStatusSlug('Experimental')).toStrictEqual({
    slug: 'experimental',
    name: 'Experimental'
  })

  expect(parseRfcStatusSlug('historic')).toStrictEqual({
    slug: 'his',
    name: 'Historic'
  })
  expect(parseRfcStatusSlug('his')).toStrictEqual({
    slug: 'his',
    name: 'Historic'
  })
  expect(parseRfcStatusSlug('Historic')).toStrictEqual({
    slug: 'his',
    name: 'Historic'
  })
  expect(parseRfcStatusSlug('informational')).toStrictEqual({
    slug: 'fyi',
    name: 'Informational'
  })
  expect(parseRfcStatusSlug('Informational')).toStrictEqual({
    slug: 'fyi',
    name: 'Informational'
  })
  expect(parseRfcStatusSlug('FYI')).toStrictEqual({
    slug: 'fyi',
    name: 'Informational'
  })

  expect(parseRfcStatusSlug('Not Issued')).toStrictEqual({
    slug: 'not-issued',
    name: 'Not Issued'
  })
  expect(parseRfcStatusSlug('Not-Issued')).toStrictEqual({
    slug: 'not-issued',
    name: 'Not Issued'
  })
  expect(parseRfcStatusSlug('not issued')).toStrictEqual({
    slug: 'not-issued',
    name: 'Not Issued'
  })
  expect(parseRfcStatusSlug('notissued')).toStrictEqual({
    slug: 'not-issued',
    name: 'Not Issued'
  })

  expect(parseRfcStatusSlug('Internet Standard')).toStrictEqual({
    slug: 'standard',
    name: 'Internet Standard'
  })
  expect(parseRfcStatusSlug('Internet-Standard')).toStrictEqual({
    slug: 'standard',
    name: 'Internet Standard'
  })
  expect(parseRfcStatusSlug('internetstandard')).toStrictEqual({
    slug: 'standard',
    name: 'Internet Standard'
  })
  expect(parseRfcStatusSlug('Standard')).toStrictEqual({
    slug: 'standard',
    name: 'Internet Standard'
  })
  expect(parseRfcStatusSlug('std')).toStrictEqual({
    slug: 'standard',
    name: 'Internet Standard'
  })

  expect(parseRfcStatusSlug('Unknown')).toStrictEqual({
    slug: 'unknown',
    name: 'Unknown'
  })
  expect(parseRfcStatusSlug('unknown')).toStrictEqual({
    slug: 'unknown',
    name: 'Unknown'
  })

  expect(parseRfcStatusSlug('proposed')).toStrictEqual({
    slug: 'proposed',
    name: 'Proposed Standard'
  })
  expect(parseRfcStatusSlug('proposedstandard')).toStrictEqual({
    slug: 'proposed',
    name: 'Proposed Standard'
  })
  expect(parseRfcStatusSlug('proposed-standard')).toStrictEqual({
    slug: 'proposed',
    name: 'Proposed Standard'
  })
  expect(parseRfcStatusSlug('Proposed Standard')).toStrictEqual({
    slug: 'proposed',
    name: 'Proposed Standard'
  })

  expect(parseRfcStatusSlug('draft')).toStrictEqual({
    slug: 'draft',
    name: 'Draft Standard'
  })
  expect(parseRfcStatusSlug('draftstandard')).toStrictEqual({
    slug: 'draft',
    name: 'Draft Standard'
  })
})
