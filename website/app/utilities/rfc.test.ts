// @vitest-environment nuxt
import { test, expect } from 'vitest'
import { DateTime } from 'luxon'
import type { ApiClient } from '../../generated/red-client'
import { isAprilFoolsRfc, parseSeriesId } from './rfc'
import { NONBREAKING_SPACE } from './strings'
import { formatDatePublished } from './rfc-converters-utils'
import type { RfcCommon } from './rfc-validators'

test('parseRFCId', () => {
  expect(parseSeriesId('rfc1234')).toEqual({
    type: 'rfc',
    number: 1234
  })

  expect(parseSeriesId('rfc1234bub')).toEqual({
    type: 'rfc',
    number: 1234
  })

  expect(parseSeriesId(`rfc${NONBREAKING_SPACE}1234`)).toEqual({
    type: 'rfc',
    number: 1234
  })
})

export type DocListResponse = Awaited<ReturnType<ApiClient['red']['docList']>>

export const blankRfcResponse: DocListResponse = {
  count: 0,
  results: []
}

test('formatDatePublished', () => {
  const jan1 = DateTime.fromObject({ year: 2025, month: 1, day: 1 })
  const april1 = DateTime.fromObject({ year: 2025, month: 4, day: 1 })

  expect(formatDatePublished(jan1, false)).toBe('January 2025')
  expect(formatDatePublished(jan1, true)).toBe('January 2025')

  expect(formatDatePublished(april1, false)).toBe('April 2025')
  expect(formatDatePublished(april1, true)).toBe('1 April 2025')
})

export const blankRfcCommon: RfcCommon = {
  number: 0,
  title: '',
  published: '1950-1-1',
  pages: 0,
  status: {
    slug: 'unknown',
    name: 'unknown'
  },
  authors: [],
  group: {
    acronym: '',
    name: ''
  },
  area: {
    acronym: '',
    name: ''
  },
  stream: {
    slug: 'Legacy',
    name: '',
    description: ''
  },
  identifiers: [],
  obsoleted_by: [],
  updated_by: [],
  formats: [],
  abstract: '',
  text: ''
}

test('isAprilFoolsRfc', () => {
  const aprilFoolsRfc = structuredClone(blankRfcCommon)
  aprilFoolsRfc.published = '1979-04-01'
  aprilFoolsRfc.group = {
    name: 'none',
    acronym: 'none'
  }
  expect(isAprilFoolsRfc(aprilFoolsRfc)).toBeTruthy()

  const notAprilFoolsRfc1 = structuredClone(aprilFoolsRfc)
  notAprilFoolsRfc1.published = '1979-04-07'
  expect(isAprilFoolsRfc(notAprilFoolsRfc1)).toBeFalsy()

  const notAprilFoolsRfc2 = structuredClone(aprilFoolsRfc)
  notAprilFoolsRfc2.group = {
    name: 'ietf',
    acronym: 'ietf'
  }
  expect(isAprilFoolsRfc(notAprilFoolsRfc2)).toBeFalsy()
})
