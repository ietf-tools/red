// @vitest-environment nuxt
import { test, expect } from 'vitest'
import { legacyErrataSearchRedirectPathBuilder } from './legacy-errata-search-redirect'
import { RFC_EDITOR_ERRATA_SEARCH_URL } from './url'

test('translateParamsString: just a redirect', () => {
  expect(legacyErrataSearchRedirectPathBuilder('?')).toEqual(RFC_EDITOR_ERRATA_SEARCH_URL)
  expect(legacyErrataSearchRedirectPathBuilder('/errata_search.php?')).toEqual(RFC_EDITOR_ERRATA_SEARCH_URL)
  expect(legacyErrataSearchRedirectPathBuilder('/errata_search.php')).toEqual(RFC_EDITOR_ERRATA_SEARCH_URL)
})

test('translateParamsString: rfc number', () => {
  expect(legacyErrataSearchRedirectPathBuilder('?rfc=9000')).toEqual(`${RFC_EDITOR_ERRATA_SEARCH_URL}?rfc=9000`)
})
