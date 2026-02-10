// @vitest-environment node
import path from 'path'
import fsPromises from 'fs/promises'
import { test, expect, vi } from 'vitest'
import { type fetchRfcPDF, rfcBucketPdfToRfcDocument } from './rfc-pdf.ts'
import { testMockAllRfcs } from '../utilities/rfcs-test-data.ts'

const RFC_NUMBER_WITH_PDF = 418

const getRfcPDFFromTest: typeof fetchRfcPDF = async (rfcNumber: number) => {
  const pdfPath = path.resolve(
    import.meta.dirname,
    '..',
    'old-rfc-editor.org',
    'pdf',
    `rfc${rfcNumber}.pdf`
  )
  return fsPromises.readFile(pdfPath, 'base64')
}

test(
  `rfcBucketPdfToRfcDocument(${RFC_NUMBER_WITH_PDF}, false)`,
  { timeout: 30_000 },
  async () => {
    const date = new Date(2025, 0, 14)
    vi.setSystemTime(date)

    const getRfcCommon = async (_rfcNumber: number) =>
      testMockAllRfcs[testMockAllRfcs.length - 1]

    const rfcBucketPdfDocument = await rfcBucketPdfToRfcDocument(
      RFC_NUMBER_WITH_PDF,
      false,
      getRfcCommon,
      getRfcPDFFromTest
    )

    expect(rfcBucketPdfDocument).toMatchSnapshot()
  }
)
