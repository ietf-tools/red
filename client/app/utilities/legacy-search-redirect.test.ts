// @vitest-environment nuxt
import { test, expect, describe, beforeEach, afterEach, vi } from 'vitest'
import { translateParamsString } from './legacy-search-redirect'

test('translateParamsString: just a redirect', () => {
  expect(translateParamsString('?')).toEqual('')
  expect(translateParamsString('/search/rfc_search.php?')).toEqual('')
  expect(translateParamsString('/search/rfc_search.php')).toEqual('')
})

test('translateParamsString: text search', () => {
  expect(translateParamsString('?title=cats')).toEqual('q=cats')
  expect(translateParamsString('?rfc=cats')).toEqual('q=cats')
  expect(translateParamsString('?rfc=dogs&title=cats')).toEqual('q=dogs+cats')
  expect(translateParamsString('?title=cats&rfc=dogs')).toEqual('q=dogs+cats')
})

test('translateParamsString: area', () => {
  expect(translateParamsString('?area_acronym=art')).toEqual('area=art')
})

test('translateParamsString: stream', () => {
  expect(translateParamsString('?stream_name=IETF')).toEqual('stream=ietf')
})

test('translateParamsString: pubstatus', () => {
  expect(
    translateParamsString(
      '?pubstatus[]=Standards Track&pubstatus[]=Best Current Practice'
    )
  ).toEqual('statuses=bcp%2Cstandard')
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
    expect(translateParamsString('?pub_date_type=this_month')).toEqual(
      'from=2020-11&to=2020-12'
    )

    vi.setSystemTime(new Date(2021, 1, 1))
    expect(translateParamsString('?pub_date_type=this_month')).toEqual(
      'from=2021-1&to=2021-2'
    )
  })

  test('this_year', () => {
    vi.setSystemTime(new Date(2020, 11, 1))
    expect(translateParamsString('?pub_date_type=this_year')).toEqual(
      'from=2020-1&to=2020-12'
    )
  })

  test('range', () => {
    vi.setSystemTime(new Date(2020, 11, 1))
    expect(
      translateParamsString(
        '?pub_date_type=range&from_month=January&from_year=1970&to_month=May&to_year=1971'
      )
    ).toEqual('from=1970-1&to=1971-5')
  })
})

test('translateParamsString: complex example', () => {
  const path =
    '/search/rfc_search_detail.php?rfc=900&title=q&pubstatus%5B%5D=Standards+Track&std_trk=Proposed+Standard&pubstatus%5B%5D=Best+Current+Practice&pubstatus%5B%5D=Experimental&pub_date_type=range&from_month=January&from_year=1970&to_month=May&to_year=1971&stream_name=IETF&area_acronym=art'

  expect(translateParamsString(path)).toEqual(
    'area=art&from=1970-1&q=900+q&statuses=bcp%2Cexperimental%2Cstandard&stream=ietf&to=1971-5'
  )
})
