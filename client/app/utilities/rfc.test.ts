// @vitest-environment nuxt
import { vi, test, expect, describe, beforeEach, afterEach } from 'vitest'
import { DateTime } from 'luxon'
import type { ApiClient } from '../../generated/red-client'
import { blankRfcCommon, isAprilFoolsRfc, parseRFCId } from './rfc'
import { NONBREAKING_SPACE } from './strings'
import {
  formatDatePublished,
  parseRfcJsonPubDateToISO
} from './rfc-converters-utils'

test('parseRFCId', () => {
  expect(parseRFCId('rfc1234')).toEqual({
    type: 'RFC',
    number: '1234'
  })

  expect(parseRFCId('rfc1234bub')).toEqual({
    type: 'RFC',
    number: '1234',
    title: 'bub'
  })

  expect(parseRFCId(`rfc${NONBREAKING_SPACE}1234`)).toEqual({
    type: 'RFC',
    number: '1234'
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

test('isAprilFoolsRfc', () => {
  const aprilFoolsRfc = structuredClone(blankRfcCommon)
  aprilFoolsRfc.published = '1979-04-01'
  aprilFoolsRfc.group.acronym = 'none'
  expect(isAprilFoolsRfc(aprilFoolsRfc)).toBeTruthy()

  const notAprilFoolsRfc1 = structuredClone(aprilFoolsRfc)
  notAprilFoolsRfc1.published = '1979-04-07'
  expect(isAprilFoolsRfc(notAprilFoolsRfc1)).toBeFalsy()

  const notAprilFoolsRfc2 = structuredClone(aprilFoolsRfc)
  notAprilFoolsRfc2.group.acronym = 'ietf'
  expect(isAprilFoolsRfc(notAprilFoolsRfc2)).toBeFalsy()
})

describe('parseRfcJsonPubDateToISO', () => {
  beforeEach(() => {
    // tell vitest we use mocked time
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  afterEach(() => {
    // restoring date after each test run
    vi.useRealTimers()
  })

  test('parseRfcJsonPubDateToISO', () => {
    const date = new Date(2025, 0, 14)
    vi.setSystemTime(date)

    expect(parseRfcJsonPubDateToISO('January 2025')).toBe(
      '2025-01-01T00:00:00.000+00:00'
    )
    expect(parseRfcJsonPubDateToISO('1 January 2025')).toBe(
      '2025-01-01T00:00:00.000+00:00'
    )

    expect(parseRfcJsonPubDateToISO('1 April 2025')).toBe(
      '2025-04-01T00:00:00.000+00:00'
    )
    expect(parseRfcJsonPubDateToISO('April 2025')).toBe(
      '2025-04-01T00:00:00.000+00:00'
    )
  })
})
