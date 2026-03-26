// @vitest-environment nuxt
import { test, expect } from 'vitest'
import { legacyErrataSearchRedirectUrlBuilder } from './legacy-errata-search-redirect'
import { useRfcEditorErrataSearchUrl } from './url'

test('translateParamsString: just a redirect', () => {
  const errataSearchUrl = useRfcEditorErrataSearchUrl()
  expect(legacyErrataSearchRedirectUrlBuilder('?')).toEqual(errataSearchUrl)
  expect(legacyErrataSearchRedirectUrlBuilder('/errata_search.php?')).toEqual(errataSearchUrl)
  expect(legacyErrataSearchRedirectUrlBuilder('/errata_search.php')).toEqual(errataSearchUrl)
})

test('translateParamsString: rfc number', () => {
  const errataSearchUrl = useRfcEditorErrataSearchUrl()
  expect(legacyErrataSearchRedirectUrlBuilder('?rfc=9000')).toEqual(`${errataSearchUrl}?rfc=9000`)
})
