// @vitest-environment node
import { test, expect, describe, beforeEach, afterEach, vi } from 'vitest'
import { legacySearchRedirectPathBuilder } from './legacy-search-redirect'

const origin = 'https://www.rfc-editor.org'

test('translateParamsString: just a redirect', () => {
  expect(legacySearchRedirectPathBuilder('?')).toEqual(`${origin}/search/`)
  expect(legacySearchRedirectPathBuilder('/search/rfc_search.php?')).toEqual(`${origin}/search/`)
  expect(legacySearchRedirectPathBuilder('/search/rfc_search.php')).toEqual(`${origin}/search/`)
})

test('translateParamsString: text search', () => {
  expect(legacySearchRedirectPathBuilder('?title=cats')).toEqual(`${origin}/search/?q=cats`)
  expect(legacySearchRedirectPathBuilder('?rfc=cats')).toEqual(`${origin}/search/?q=cats`)
  expect(legacySearchRedirectPathBuilder('?rfc=dogs&title=cats')).toEqual(`${origin}/search/?q=dogs+cats`)
  expect(legacySearchRedirectPathBuilder('?title=cats&rfc=dogs')).toEqual(`${origin}/search/?q=dogs+cats`)
})

test('translateParamsString: area', () => {
  expect(legacySearchRedirectPathBuilder('?area_acronym=art')).toEqual(`${origin}/search/?area=art`)
})

test('translateParamsString: stream', () => {
  expect(legacySearchRedirectPathBuilder('?stream_name=IETF')).toEqual(`${origin}/search/?stream=ietf`)
})

test('translateParamsString: pubstatus', () => {
  expect(legacySearchRedirectPathBuilder('?pubstatus[]=Standards Track&pubstatus[]=Best Current Practice')).toEqual(
    `${origin}/search/?status=Best+Current+Practice`
  )
})

describe('translateParamsString: dates', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('this_month', () => {
    vi.setSystemTime(new Date(2020, 11, 1))
    expect(legacySearchRedirectPathBuilder('?pub_date_type=this_month')).toEqual(
      `${origin}/search/?from=2020-11&to=2020-12`
    )

    vi.setSystemTime(new Date(2021, 1, 1))
    expect(legacySearchRedirectPathBuilder('?pub_date_type=this_month')).toEqual(
      `${origin}/search/?from=2021-1&to=2021-2`
    )
  })

  test('this_year', () => {
    vi.setSystemTime(new Date(2020, 11, 1))
    expect(legacySearchRedirectPathBuilder('?pub_date_type=this_year')).toEqual(
      `${origin}/search/?from=2020-1&to=2020-12`
    )
  })

  test('range', () => {
    vi.setSystemTime(new Date(2020, 11, 1))
    expect(
      legacySearchRedirectPathBuilder(
        '?pub_date_type=range&from_month=January&from_year=1970&to_month=May&to_year=1971'
      )
    ).toEqual(`${origin}/search/?from=1970-1&to=1971-5`)
  })
})

test('translateParamsString: complex example', () => {
  const url =
    '/search/rfc_search_detail.php?rfc=900&title=q&pubstatus%5B%5D=Standards+Track&std_trk=Proposed+Standard&pubstatus%5B%5D=Best+Current+Practice&pubstatus%5B%5D=Experimental&pub_date_type=range&from_month=January&from_year=1970&to_month=May&to_year=1971&stream_name=IETF&area_acronym=art'

  expect(legacySearchRedirectPathBuilder(url)).toEqual(
    `${origin}/search/?area=art&from=1970-1&q=900+q&status=Best+Current+Practice%2CExperimental%2CProposed+Standard&stream=ietf&to=1971-5`
  )
})

test('translateParamsString: complex example (2)', () => {
  const url =
    '/search/rfc_search_detail.php?title=mail&pubstatus[]=Standards+Track&std_trk=Internet+Standard&pub_date_type=any'

  expect(legacySearchRedirectPathBuilder(url)).toEqual(`${origin}/search/?q=mail&status=Internet+Standard`)
})

test("translateParamsString: 'Not Issued' pubstatus doesn't fail the redirect", () => {
  // There is no filter to map 'Not Issued' to, so the value is dropped rather than failing the
  // redirect.
  expect(legacySearchRedirectPathBuilder('?pubstatus[]=Not Issued')).toEqual(`${origin}/search/`)

  // A status it can filter by still survives alongside one it can't.
  expect(legacySearchRedirectPathBuilder('?pubstatus[]=Not Issued&pubstatus[]=Historic')).toEqual(
    `${origin}/search/?status=Historic`
  )
})

test('translateParamsString: area acronyms pass through regardless of whether a fixed list would know them', () => {
  // Real `area.acronym` values a fixed list would be likely to miss; the filter must pass through
  // regardless.
  expect(legacySearchRedirectPathBuilder('?area_acronym=iesg')).toEqual(`${origin}/search/?area=iesg`)
  expect(legacySearchRedirectPathBuilder('?area_acronym=mgt')).toEqual(`${origin}/search/?area=mgt`)
  expect(legacySearchRedirectPathBuilder('?area_acronym=ops-old')).toEqual(`${origin}/search/?area=ops-old`)
})
