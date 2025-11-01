// @vitest-environment node
import { test, expect, vi } from 'vitest'
import { rfcBucketPdfToRfcDocument } from './rfc-pdf.ts'
import { testMockAllRfcs } from '../utilities/rfcs-test-data.ts'

const RFC_NUMBER_WITH_PDF = 418

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
      getRfcCommon
    )
    expect(rfcBucketPdfDocument).toMatchSnapshot()
  }
)
