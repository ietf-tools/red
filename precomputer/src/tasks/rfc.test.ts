// @vitest-environment node
import { test, expect } from 'vitest'
import { renderRefsRef } from './rfc.ts'
import { testMockAllRfcs } from '../utilities/rfcs-test-data.ts'

test('renderRfcRef 298', async () => {
  const rfc298 = testMockAllRfcs.find((rfc) => rfc.number === 298)
  if(rfc298 === undefined) {
    throw Error(`Couldn't find RFC 298 in mock data`)
  }
  const rfc298Ref = renderRefsRef(rfc298)
  expect(rfc298Ref).toMatchSnapshot()
})

test('renderRfcRef 9804', async () => {
  const rfc9804 = testMockAllRfcs.find((rfc) => rfc.number === 9804)
  if(rfc9804 === undefined) {
    throw Error(`Couldn't find RFC 9804 in mock data`)
  }
  const rfc9804Ref = renderRefsRef(rfc9804)
  expect(rfc9804Ref).toMatchSnapshot()
})
