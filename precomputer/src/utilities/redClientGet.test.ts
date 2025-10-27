// @vitest-environment node
import fsPromises from 'node:fs/promises'
import { test, expect } from 'vitest'
import { getRedClient, sortInfoSubseriesItem } from './redClientGet'
import { testMockAllSubseries } from './rfcs-test-data'
import { parseStatus, getAllRFCs, getAllSubseries } from './redClientGet'
import type { DocListArg } from './redClientGet'
import { RfcCommonStatusSchema } from '../../../website/app/utilities/rfc-validators'

test('sortInfoSubseriesItem', () => {
  expect(
    structuredClone(testMockAllSubseries)
      .sort(sortInfoSubseriesItem)
      .map((item) => `${item.type}${item.number}`)
  ).toMatchSnapshot()
})

test('parseStatusSlug: bad inputs', () => {
  expect(() =>
    parseStatus(
      // invalid mismatch of slug and name
      { slug: 'exp', name: 'best current practice' }
    )
  ).toThrow()

  expect(() =>
    parseStatus({
      // unexpected name casing
      slug: 'exp',
      name: 'Experimental'
    })
  ).toThrow()
})

test('parseStatusSlug: good inputs', () => {
  expect(
    parseStatus({ slug: 'bcp', name: 'best current practice' })
  ).toStrictEqual({
    slug: 'bcp',
    name: 'best current practice'
  })

  expect(parseStatus({ slug: 'exp', name: 'experimental' })).toStrictEqual({
    slug: 'exp',
    name: 'experimental'
  })

  expect(parseStatus({ slug: 'hist', name: 'historic' })).toStrictEqual({
    slug: 'hist',
    name: 'historic'
  })

  expect(parseStatus({ slug: 'inf', name: 'informational' })).toStrictEqual({
    slug: 'inf',
    name: 'informational'
  })

  expect(parseStatus({ slug: 'not-issued', name: 'not issued' })).toStrictEqual(
    {
      slug: 'not-issued',
      name: 'not issued'
    }
  )

  expect(parseStatus({ slug: 'unkn', name: 'unknown' })).toStrictEqual({
    slug: 'unkn',
    name: 'unknown'
  })
})