// @vitest-environment nuxt
import { test, expect } from 'vitest'
import { DateTime } from 'luxon'
import type { ApiClient } from '../../../precomputer/generated/api-client'
import { areaLabel, isAprilFoolsRfc, isAreaSponsored, parseSeriesId, realGroup } from './rfc'
import { NONBREAKING_SPACE } from './strings'
import { formatDatePublished } from './rfc-converters-utils'
import type { RfcCommon } from './rfc-validators'

test('parseRFCId', () => {
  expect(parseSeriesId('rfc1234')).toEqual({
    type: 'rfc',
    number: 1234
  })

  expect(parseSeriesId('rfc1234suffix')).toEqual(undefined)
  expect(parseSeriesId(`rfc${NONBREAKING_SPACE}1234`)).toEqual(undefined)
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
    slug: 'unkn',
    name: 'unknown'
  },
  authors: [],
  group: {
    acronym: '',
    name: '',
    type: 'area'
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
  aprilFoolsRfc.stream.slug = 'INDEPENDENT'
  aprilFoolsRfc.published = '1979-04-01'
  aprilFoolsRfc.group = {
    type: 'area',
    name: 'none',
    acronym: 'none'
  }
  expect(isAprilFoolsRfc(aprilFoolsRfc)).toBeTruthy()

  const notAprilFoolsRfc1 = structuredClone(aprilFoolsRfc)
  notAprilFoolsRfc1.published = '1979-04-07'
  expect(isAprilFoolsRfc(notAprilFoolsRfc1)).toBeFalsy()

  const notAprilFoolsRfc2 = structuredClone(aprilFoolsRfc)
  notAprilFoolsRfc2.group = {
    type: 'ietf',
    name: 'ietf',
    acronym: 'ietf'
  }
  expect(isAprilFoolsRfc(notAprilFoolsRfc2)).toBeFalsy()
})

test('realGroup treats the datatracker placeholder group "none" as no group', () => {
  const group = (acronym: string): NonNullable<RfcCommon['group']> => ({
    acronym,
    name: acronym,
    state: 'active',
    type: 'wg'
  })

  expect(realGroup(undefined)).toBeUndefined()
  expect(realGroup(group('none'))).toBeUndefined()
  expect(realGroup(group('quic'))).toEqual(group('quic'))
})

test('isAreaSponsored is true only for IETF-stream documents without a working group', () => {
  const rfc = (
    slug: RfcCommon['stream']['slug'],
    group?: Partial<NonNullable<RfcCommon['group']>>
  ): Pick<RfcCommon, 'stream' | 'group'> => ({
    stream: { slug, name: slug },
    group: group && { acronym: 'x', name: 'x', state: 'active', type: 'wg', ...group }
  })

  expect(isAreaSponsored(rfc('IETF', { acronym: 'quic' }))).toBe(false)
  expect(isAreaSponsored(rfc('IETF', { acronym: 'httpbis' }))).toBe(false)
  expect(isAreaSponsored(rfc('IETF', { acronym: 'none' }))).toBe(true)
  expect(isAreaSponsored(rfc('IETF', { type: 'area' }))).toBe(true)
  expect(isAreaSponsored(rfc('IETF'))).toBe(true)
  expect(isAreaSponsored(rfc('IAB'))).toBe(false)
  expect(isAreaSponsored(rfc('INDEPENDENT'))).toBe(false)
  expect(isAreaSponsored(rfc('Legacy'))).toBe(false)
})

test('areaLabel appends "Area" only when the name does not already end with it', () => {
  const area = (name: string): NonNullable<RfcCommon['area']> => ({ acronym: 'x', name })

  expect(areaLabel(area('Web and Internet Transport'))).toBe('Web and Internet Transport Area')
  expect(areaLabel(area('Applications Area'))).toBe('Applications Area')
})
