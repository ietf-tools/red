import { vi, test, expect } from 'vitest'
import { renderRfcIndexXml } from './rfc-index-xml'
import { testMockAllRfcs } from '../utilities/rfcs-test-data.ts'

test('render rfc-index.xml', async () => {
  const date = new Date(2025, 0, 14)
  vi.setSystemTime(date)

  // the renderRfcIndexXml function will validate the XML
  // against the XSD before returning it
  const { xml, xsd } = await renderRfcIndexXml(testMockAllRfcs)

  // validation has already occured so this is just
  // a basic sanity check on the responses.
  expect(xml.length).toBeGreaterThan(1000)
  expect(xsd.length).toBeGreaterThan(1000)
})
