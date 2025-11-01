// @vitest-environment node
import { test, expect, vi } from 'vitest'
import { fetchSourceRfcHtml, rfcBucketHtmlToRfcDocument } from './rfc-html.ts'
import { testMockAllRfcs } from '../utilities/rfcs-test-data.ts'

const processRfcBucketHtml = async (rfcNumber: number) => {
  const date = new Date(2025, 0, 14)
  vi.setSystemTime(date)
  const html = await fetchSourceRfcHtml(rfcNumber)
  const getRfcCommon = async (_rfcNumber: number) =>
    testMockAllRfcs[testMockAllRfcs.length - 1]
  if (html) {
    return rfcBucketHtmlToRfcDocument(html, rfcNumber, getRfcCommon)
  }
}

const RFC_NUMBER_WITH_PLAINTEXT = 2000
const RFC_NUMBER_WITH_XML2RFC_HTML = 9000

test(`processRfcBucketHtml(${RFC_NUMBER_WITH_PLAINTEXT}) RFC without TOC`, async () => {
  const rfcBucketHtmlDocument = await processRfcBucketHtml(
    RFC_NUMBER_WITH_PLAINTEXT
  )

  expect(rfcBucketHtmlDocument).toMatchSnapshot()

  expect(rfcBucketHtmlDocument?.tableOfContents).toBeTruthy()
})

test(`processRfcBucketHtml(${RFC_NUMBER_WITH_XML2RFC_HTML}) RFC with TOC`, async () => {
  const rfcBucketHtmlDocument = await processRfcBucketHtml(
    RFC_NUMBER_WITH_XML2RFC_HTML
  )
  expect(rfcBucketHtmlDocument).toMatchSnapshot()
  expect(rfcBucketHtmlDocument?.tableOfContents).toBeTruthy()
})
