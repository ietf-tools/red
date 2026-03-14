// @vitest-environment node
import path from 'path'
import fsPromises from 'fs/promises'
import { test, expect, vi } from 'vitest'
import { fetchSourceRfcHtml, rfcBucketHtmlToRfcDocument } from './rfc-html.ts'
import {
  testMockAllRfcs,
  testMockErrataList
} from '../utilities/rfcs-test-data.ts'
import { getFromS3 } from '../utilities/s3.ts'

const getRfcHtml: typeof getFromS3 = (key, outputType) => {
  const htmlPath = path.resolve(
    import.meta.dirname,
    '..',
    'old-rfc-editor.org',
    key
  )
  return fsPromises.readFile(
    htmlPath,
    outputType === 'base64' ? 'base64' : 'utf-8'
  )
}

const processRfcBucketHtml = async (rfcNumber: number) => {
  const date = new Date(2025, 0, 14)
  vi.setSystemTime(date)

  const html = await fetchSourceRfcHtml(rfcNumber, getRfcHtml)

  const getRfcCommon = async (_rfcNumber: number) =>
    testMockAllRfcs[testMockAllRfcs.length - 1]

  const getErrataByRfcNumber = async (rfcNumber: number) =>
    testMockErrataList.filter(
      (errataItem) => errataItem['doc-id'] === `RFC${rfcNumber}`
    )

  if (html) {
    return rfcBucketHtmlToRfcDocument(
      html,
      rfcNumber,
      getRfcCommon,
      getErrataByRfcNumber
    )
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
