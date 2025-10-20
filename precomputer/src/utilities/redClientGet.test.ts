// @vitest-environment node
import { test, expect } from 'vitest'
import { sortInfoSubseriesItem } from './redClientGet'
import { testMockAllSubseries } from './rfcs-test-data'
import { parseStatusSlug } from './redClientGet'

test('sortInfoSubseriesItem', () => {
  expect(
    structuredClone(testMockAllSubseries)
      .sort(sortInfoSubseriesItem)
      .map((item) => `${item.type}${item.number}`)
  ).toMatchSnapshot()
})

test('parseStatusSlug: bad inputs', () => {
  expect(() => parseStatusSlug('unknown status slug')).toThrow()
  expect(() => parseStatusSlug('')).toThrow()
})

test('parseStatusSlug: good inputs', () => {
  expect(parseStatusSlug('Best Current Practice')).toStrictEqual({
    slug: 'bcp',
    name: 'Best Current Practice'
  })
  expect(parseStatusSlug('best-current-practice')).toStrictEqual({
    slug: 'bcp',
    name: 'Best Current Practice'
  })
  expect(parseStatusSlug('bcp')).toStrictEqual({
    slug: 'bcp',
    name: 'Best Current Practice'
  })
  expect(parseStatusSlug('BCP')).toStrictEqual({
    slug: 'bcp',
    name: 'Best Current Practice'
  })

  expect(parseStatusSlug('experimental')).toStrictEqual({
    slug: 'experimental',
    name: 'Experimental'
  })
  expect(parseStatusSlug('Experimental')).toStrictEqual({
    slug: 'experimental',
    name: 'Experimental'
  })

  expect(parseStatusSlug('historic')).toStrictEqual({
    slug: 'his',
    name: 'Historic'
  })
  expect(parseStatusSlug('his')).toStrictEqual({
    slug: 'his',
    name: 'Historic'
  })
  expect(parseStatusSlug('Historic')).toStrictEqual({
    slug: 'his',
    name: 'Historic'
  })
  expect(parseStatusSlug('informational')).toStrictEqual({
    slug: 'informational',
    name: 'Informational'
  })
  expect(parseStatusSlug('Informational')).toStrictEqual({
    slug: 'informational',
    name: 'Informational'
  })
  expect(parseStatusSlug('FYI')).toStrictEqual({
    slug: 'fyi',
    name: 'FYI'
  })
  expect(parseStatusSlug('informational')).toStrictEqual({
    slug: 'informational',
    name: 'Informational'
  })
  expect(parseStatusSlug('Not Issued')).toStrictEqual({
    slug: 'not-issued',
    name: 'Not Issued'
  })
  expect(parseStatusSlug('Not-Issued')).toStrictEqual({
    slug: 'not-issued',
    name: 'Not Issued'
  })
  expect(parseStatusSlug('not issued')).toStrictEqual({
    slug: 'not-issued',
    name: 'Not Issued'
  })
  expect(parseStatusSlug('notissued')).toStrictEqual({
    slug: 'not-issued',
    name: 'Not Issued'
  })

  expect(parseStatusSlug('Internet Standard')).toStrictEqual({
    slug: 'standard',
    name: 'Internet Standard'
  })
  expect(parseStatusSlug('Internet-Standard')).toStrictEqual({
    slug: 'standard',
    name: 'Internet Standard'
  })
  expect(parseStatusSlug('internetstandard')).toStrictEqual({
    slug: 'standard',
    name: 'Internet Standard'
  })
  expect(parseStatusSlug('Standard')).toStrictEqual({
    slug: 'standard',
    name: 'Internet Standard'
  })
  expect(parseStatusSlug('std')).toStrictEqual({
    slug: 'standard',
    name: 'Internet Standard'
  })

  expect(parseStatusSlug('Unknown')).toStrictEqual({
    slug: 'unknown',
    name: 'Unknown'
  })
  expect(parseStatusSlug('unknown')).toStrictEqual({
    slug: 'unknown',
    name: 'Unknown'
  })

  expect(parseStatusSlug('ps')).toStrictEqual({
    slug: 'ps',
    name: 'Proposed Standard'
  })
  expect(parseStatusSlug('proposed')).toStrictEqual({
    slug: 'ps',
    name: 'Proposed Standard'
  })
  expect(parseStatusSlug('proposedstandard')).toStrictEqual({
    slug: 'ps',
    name: 'Proposed Standard'
  })
  expect(parseStatusSlug('proposed-standard')).toStrictEqual({
    slug: 'ps',
    name: 'Proposed Standard'
  })
  expect(parseStatusSlug('Proposed Standard')).toStrictEqual({
    slug: 'ps',
    name: 'Proposed Standard'
  })

  expect(parseStatusSlug('draft')).toStrictEqual({
    slug: 'draft',
    name: 'Draft Standard'
  })
  expect(parseStatusSlug('draftstandard')).toStrictEqual({
    slug: 'draft',
    name: 'Draft Standard'
  })
})
