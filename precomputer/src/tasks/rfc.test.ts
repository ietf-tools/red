// @vitest-environment node
import { test, expect } from 'vitest'
import { renderRefsRef } from './rfc.ts'
import { testMockAllRfcs } from '../utilities/rfcs-test-data.ts'

// See also authors.ts for other authors formatting variations

test('renderRfcRef 1048', async () => {
  const rfc1048 = testMockAllRfcs.find((rfc) => rfc.number === 1048)
  if (rfc1048 === undefined) {
    throw Error(`Couldn't find RFC 1048 in mock data`)
  }
  const rfc1048Ref = renderRefsRef(rfc1048)
  expect(rfc1048Ref).toMatch(
    'Prindeville, P., "BOOTP vendor information extensions", RFC 1048, DOI 10.17487/RFC1048, February 1988, <https://www.rfc-editor.org/info/rfc1048/>.'
  )
})
