// @vitest-environment nuxt
import { test, expect } from 'vitest'
import { legacyErrataSearchRedirectUrlBuilder } from './legacy-errata-search-redirect'
import { RFC_EDITOR_ERRATA_SEARCH_URL } from './url'

test('translateParamsString: just a redirect', () => {
  expect(legacyErrataSearchRedirectUrlBuilder('?')).toEqual(RFC_EDITOR_ERRATA_SEARCH_URL)
  expect(legacyErrataSearchRedirectUrlBuilder('/errata_search.php?')).toEqual(RFC_EDITOR_ERRATA_SEARCH_URL)
  expect(legacyErrataSearchRedirectUrlBuilder('/errata_search.php')).toEqual(RFC_EDITOR_ERRATA_SEARCH_URL)
})

test('translateParamsString: rfc number', () => {
  expect(legacyErrataSearchRedirectUrlBuilder('?rfc=9000')).toEqual(`${RFC_EDITOR_ERRATA_SEARCH_URL}?rfc=9000`)
})
