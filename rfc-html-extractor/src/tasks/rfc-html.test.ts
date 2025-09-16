// @vitest-environment node
import { test, expect } from 'vitest'
import {
  fetchSourceRfcHtml,
  rfcBucketHtmlToRfcDocument
} from './rfc-html.ts'

const processRfcBucketHtml = async (rfcNumber: number) => {
  const html = await fetchSourceRfcHtml(rfcNumber)
  if (html) {
    return rfcBucketHtmlToRfcDocument(html, rfcNumber)
  }
}

const RFC_PLAINTEXT_EXAMPLE = 2000
const RFC_XML2RFC_EXAMPLE = 9000

test(`processRfcBucketHtml(${RFC_PLAINTEXT_EXAMPLE}) RFC without TOC`, async () => {
  const rfcBucketHtmlDocument = await processRfcBucketHtml(
    RFC_PLAINTEXT_EXAMPLE
  )

  expect(rfcBucketHtmlDocument).toMatchSnapshot()

  expect(rfcBucketHtmlDocument?.tableOfContents).toBeTruthy()
})

test(`processRfcBucketHtml(${RFC_XML2RFC_EXAMPLE}) RFC with TOC`, async () => {
  const rfcBucketHtmlDocument = await processRfcBucketHtml(RFC_XML2RFC_EXAMPLE)
  expect(rfcBucketHtmlDocument).toMatchSnapshot()
  expect(rfcBucketHtmlDocument?.tableOfContents).toBeTruthy()
})
