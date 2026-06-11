import { z } from 'zod'
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  paginateListObjectsV2,
  DeleteObjectCommand
} from '@aws-sdk/client-s3'
import { PromisePool } from '@supercharge/promise-pool'
import type { RfcCommon, SubseriesCommon } from '../../../website/app/utilities/rfc-validators.ts'
import { assertIsString } from './typescript.ts'
import { fetchSourceRfcHtml } from '../tasks/rfc-html.ts'
import { fetchRfcPDF } from '../tasks/rfc-pdf.ts'
import { sortByRfcPublish } from './rfc-sorting.ts'
import { sleep } from './sleep.ts'

const NUMBER_OF_S3_RETRIES = 5
const DELAY_BETWEEN_S3_RETRIES_MS = 1000

let s3Ref: undefined | { s3RfcCli: S3Client; s3RedCli: S3Client } = undefined

const getS3Singleton = () => {
  if (!s3Ref) {
    const S3_RFC_ENDPOINT = process.env.S3_RFC_ENDPOINT
    const S3_RFC_ACCESS_ID = process.env.S3_RFC_ACCESS_ID
    const S3_RFC_ACCESS_KEY = process.env.S3_RFC_ACCESS_KEY
    assertIsString(S3_RFC_ENDPOINT, `process.env.S3_RFC_ENDPOINT wasn't a string. Was ${typeof S3_RFC_ENDPOINT}`)
    assertIsString(S3_RFC_ACCESS_ID, `process.env.S3_RFC_ACCESS_ID wasn't a string. Was ${typeof S3_RFC_ACCESS_ID}`)
    assertIsString(S3_RFC_ACCESS_KEY, `process.env.S3_RFC_ACCESS_KEY wasn't a string. Was ${typeof S3_RFC_ACCESS_KEY}`)

    const s3RfcCli = new S3Client({
      endpoint: S3_RFC_ENDPOINT,
      region: 'auto',
      credentials: {
        accessKeyId: S3_RFC_ACCESS_ID,
        secretAccessKey: S3_RFC_ACCESS_KEY ?? ''
      },
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED'
    })

    const S3_RED_ENDPOINT = process.env.S3_RED_ENDPOINT
    const S3_RED_ACCESS_ID = process.env.S3_RED_ACCESS_ID
    const S3_RED_ACCESS_KEY = process.env.S3_RED_ACCESS_KEY
    assertIsString(S3_RED_ENDPOINT, `process.env.S3_RED_ENDPOINT wasn't a string. Was ${typeof S3_RED_ENDPOINT}`)
    assertIsString(S3_RED_ACCESS_ID, `process.env.S3_RED_ACCESS_ID wasn't a string. Was ${typeof S3_RED_ACCESS_ID}`)
    assertIsString(S3_RED_ACCESS_KEY, `process.env.S3_RED_ACCESS_KEY wasn't a string. Was ${typeof S3_RED_ACCESS_KEY}`)

    const s3RedCli = new S3Client({
      endpoint: S3_RED_ENDPOINT,
      region: 'auto',
      credentials: {
        accessKeyId: S3_RED_ACCESS_ID,
        secretAccessKey: S3_RED_ACCESS_KEY
      },
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED'
    })

    s3Ref = { s3RfcCli, s3RedCli }
  }

  return s3Ref
}

type S3OutputType = 'default' | 'base64'

export async function getFromS3(
  bucket: 'S3_RFC_BUCKET' | 'S3_RED_BUCKET',
  key: string,
  outputType: S3OutputType,
  prefixForDebug: string
): Promise<string | Uint8Array | null> {
  const S3_BUCKET = bucket === 'S3_RFC_BUCKET' ? process.env.S3_RFC_BUCKET : process.env.S3_RED_BUCKET
  assertIsString(S3_BUCKET, `process.env.${bucket} wasn't a string. Was ${typeof S3_BUCKET}`)

  const { s3RedCli, s3RfcCli } = getS3Singleton()

  const s3Client = bucket === 'S3_RFC_BUCKET' ? s3RfcCli : s3RedCli

  let attemptsRemaining = NUMBER_OF_S3_RETRIES

  const errors: unknown[] = []
  while (attemptsRemaining > 0) {
    attemptsRemaining--
    try {
      const resp = await s3Client.send(
        new GetObjectCommand({
          Bucket: S3_BUCKET,
          Key: key
        })
      )
      if (resp.Body) {
        switch (outputType) {
          case 'base64': {
            return (await resp.Body.transformToString('base64')) ?? null
          }
          default: {
            return (await resp.Body.transformToString()) ?? null
          }
        }
      }
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'Code' in err && err.Code === 'NoSuchKey') {
        // The file doesn't exist so there's no need to retry
        return null
      }

      console.warn(
        `[${prefixForDebug}]`,
        `S3 download problem. ${attemptsRemaining} attempts remaining. Retrying in ${DELAY_BETWEEN_S3_RETRIES_MS}ms`
      )
      await sleep(DELAY_BETWEEN_S3_RETRIES_MS)
      errors.push(err)
    }
  }

  const errorHeader = `[${prefixForDebug}] Failed to fetch ${JSON.stringify(key)} from ${JSON.stringify(S3_BUCKET)} bucket.`
  console.error(errorHeader, ...errors)
  return null
}

type StreamingBlobPayloadInputTypes = ConstructorParameters<typeof PutObjectCommand>[0]['Body']

export async function saveToS3(key: string, contents: StreamingBlobPayloadInputTypes): Promise<void> {
  const prefixForDebug = `[S3 Upload ${key}]`
  const S3_RED_BUCKET = process.env.S3_RED_BUCKET
  assertIsString(S3_RED_BUCKET, `process.env.S3_RED_BUCKET wasn't a string. Was ${typeof S3_RED_BUCKET}`)
  // console.log(`[${S3_RED_BUCKET}] saving ${key}`, ' with contents ', contents)
  const { s3RedCli } = getS3Singleton()
  let attemptsRemaining = NUMBER_OF_S3_RETRIES

  const errors: unknown[] = []
  while (attemptsRemaining > 0) {
    attemptsRemaining--
    try {
      const putResult = await s3RedCli.send(
        new PutObjectCommand({
          Bucket: S3_RED_BUCKET,
          Key: key,
          Body: contents
        })
      )
      if (putResult.$metadata.httpStatusCode === 200) {
        // console.log(prefixForDebug, `succeeded`)
        return
      }
      throw Error(String(putResult))
    } catch (err: unknown) {
      console.warn(
        prefixForDebug,
        `Failure. ${attemptsRemaining} attempts remaining. Retrying in ${DELAY_BETWEEN_S3_RETRIES_MS}ms`
      )
      await sleep(DELAY_BETWEEN_S3_RETRIES_MS)
      errors.push(err)
    }
  }

  const errorHeader = `[${prefixForDebug}] All attempts to upload ${JSON.stringify(key)} to ${JSON.stringify(S3_RED_BUCKET)} bucket failed.`
  console.error(errorHeader, ...errors)
  return
}

export const listS3Files = async () => {
  const { s3RedCli } = getS3Singleton()
  const S3_RED_BUCKET = process.env.S3_RED_BUCKET
  assertIsString(S3_RED_BUCKET, `process.env.S3_RED_BUCKET wasn't a string. Was ${typeof S3_RED_BUCKET}`)
  const keys = []
  for await (const data of paginateListObjectsV2({ client: s3RedCli }, { Bucket: S3_RED_BUCKET })) {
    keys.push(...(data.Contents ?? []))
  }
  keys.sort()
  return keys
}

export const deleteFromS3 = async (key: string): Promise<void> => {
  const { s3RedCli } = getS3Singleton()
  const S3_RED_BUCKET = process.env.S3_RED_BUCKET
  assertIsString(S3_RED_BUCKET, `process.env.S3_RED_BUCKET wasn't a string. Was ${typeof S3_RED_BUCKET}`)
  await s3RedCli.send(
    new DeleteObjectCommand({
      Bucket: S3_RED_BUCKET,
      Key: key
    })
  )
}

// This is just a hint number, not a hard limit at all
const NUMBER_OF_CONCURRENT_S3_USAGES = 4
const CHECK_RFC_NUMBER_LARGEST_MINUS_N = 500
export const ERROR_CODE_RFC_MISSING_CONTENT = 'RFC_MISSING_CONTENT'
export const ERROR_CODE_RFC_BUCKET_ERROR = 'RFC_BUCKET_ERROR'

type CheckRfcContentsExistProps = {
  rfcs: Readonly<RfcCommon[]>
}

/**
 * RFCs come from the Datatracker API but recent RFCs might not have their bucket files,
 * such as html or pdf etc., yet.
 *
 * On staging the bucket might be very out of sync.
 */
export const filterRFCsByBucketContentExisting = async ({
  rfcs
}: CheckRfcContentsExistProps): Promise<Readonly<RfcCommon[]>> => {
  const rfcNumbersToCheck = rfcs
    .toSorted(
      // The best indicator of RFCs that need content checking is the `published` date,
      // not the RFC number.
      sortByRfcPublish
    )
    .slice(0, CHECK_RFC_NUMBER_LARGEST_MINUS_N)
    .map((rfc) => rfc.number)
    .sort((a, b) => b - a)

  console.log('[RFC contents] Checking RFC contents for RFCs: ', rfcNumbersToCheck.join(', '))

  const {
    results, // list of rfc numbers whose content doesn't exist on the bucket, or `true` for rfcs whose content does exist
    errors
  } = await PromisePool.for(rfcNumbersToCheck)
    .withConcurrency(NUMBER_OF_CONCURRENT_S3_USAGES)
    .process(async (rfcNumber) => {
      try {
        // try HTML
        const rfcHTML = await fetchSourceRfcHtml(rfcNumber, getFromS3)
        if (rfcHTML === null) {
          // try PDF
          const rfcPDF = await fetchRfcPDF(rfcNumber)
          if (rfcPDF === null) {
            console.log(`[RFC Contents Check] [RFC ${rfcNumber}] Bucket lacks RFC contents`)
            return rfcNumber
          }
        }
        return true
      } catch (err) {
        console.error(`[RFC ${rfcNumber}] threw exception: ${String(err)}`)
        throw err
      }
    })

  if (errors && errors.length > 0) {
    console.error(`[${ERROR_CODE_RFC_BUCKET_ERROR}] there were errors getting RFC contents from the bucket`)
  }

  const rfcsContentsDoNotExist = results.filter((result) => result !== true)

  if (rfcsContentsDoNotExist.length > 0) {
    console.warn(
      `[${ERROR_CODE_RFC_MISSING_CONTENT}]`,
      `RFC content (html/pdf) doesn't exist for these recent RFCs: ${rfcsContentsDoNotExist.join(', ')}`
    )
  } else {
    console.log('[RFC contents check] Success, all recent RFCs have content')
  }

  return rfcs.filter((rfc) => !rfcsContentsDoNotExist.includes(rfc.number))
}

export const rfcCommonPathBuilder = (rfcNumber: number) => `rfc-common/${rfcNumber}.json` as const

export const rfcHtmlJsonPathBuilder = (rfcNumber: number) => `rfc/${rfcNumber}.json` as const

export const rfcRefPathBuilder = (rfcNumber: number) => `rfc-ref/${rfcNumber}.txt` as const

export const rfcImageFileNameBuilder = (rfcNumber: number, pageNumber: number) =>
  `${rfcNumber}-page-${pageNumber}.png` as const

export const rfcImagePathBuilder = (fileName: string) => `rfc/${fileName}` as const

export const rfcBucketHtmlPathBuilder = (rfcNumber: number) => `html/rfc${rfcNumber}.html`

export const rfcMetaThumbnailPathBuilder = (rfcNumber: number) => `thumbnail/rfc${rfcNumber}.png` as const

export const metaThumbnailPathBuilder = (fileName: string) => `thumbnail/${fileName}` as const

export const faviconPathBuilder = (widthPx: number, heightPx: number) =>
  `other/favicon-${widthPx}x${heightPx}.png` as const

export const subseriesInfoPathBuilder = (
  subseriesType: SubseriesCommon['type'],
  subseriesNumber: SubseriesCommon['number']
) => `subseries/${subseriesType}${subseriesNumber}.json` as const

export const ROBOTS_TXT_PATH = 'other/robots.txt' as const

export const HOMEPAGE_LATEST_PATH = `other/homepage-latest.json` as const

export const RFC_INDEX_TXT_PATH = 'other/rfc-index.txt' as const

// This file isn't created by Red anymore. It's created by Datatracker.
export const RFC_INDEX_XML_PATH = 'other/rfc-index.xml' as const

export const RFC_MINI_INDEX_JSON_PATH = 'other/rfc-mini-index.json' as const

export const RFC_INDEX_XSD_PATH = 'other/rfc-index.xsd' as const

export const RFC_FEED_RSS_PATH = 'other/rfcrss.xml' as const

export const RFC_FEED_ATOM_PATH = 'other/rfcatom.xml' as const

export const IN_NOTES_RFC_REF_DOT_TXT_PATH = 'other/in-notes/rfc-ref.txt' as const

export const ERRATA_JSON_PATH = 'other/errata.json' as const

export const REPORTS_CURRENT_QUEUE_STATS_DOT_TXT_PATH = 'other/reports/CurrQstats.txt'

export const siteMapXmlPathPrefixBuilder = (sitemapFilename: string) => {
  return `other${sitemapFilename}` as const
}
export const markdownPagePathBuilder = (slug: string) => `content/${slug}.json` as const

export const UNUSABLE_RFC_NUMBERS_PATH = 'other/unusable-rfc-numbers.json'

const UnusableRfcNumbersSchema = z
  .object({
    number: z.number(),
    comment: z.string()
  })
  .array()

export type UnusableRfcNumbers = z.infer<typeof UnusableRfcNumbersSchema>

export const getUnusableRfcNumbers = async (): Promise<UnusableRfcNumbers> => {
  const usableRfcNumbersJson = await getFromS3('S3_RED_BUCKET', UNUSABLE_RFC_NUMBERS_PATH, 'default', '')
  const usableRfcNumbersObj = JSON.parse(String(usableRfcNumbersJson))
  return UnusableRfcNumbersSchema.parse(usableRfcNumbersObj)
}

/**
 * A list of unusable RFC numbers specified in JSON from a bucket
 * Note: IIFE
 */
export const getUnusableRfcNumbersCached = (() => {
  let unusableRfcNumbersPromise: ReturnType<typeof getUnusableRfcNumbers> | undefined = undefined
  return () => {
    if (!unusableRfcNumbersPromise) {
      // defer promise instantiation until first call so that tests etc don't run this
      unusableRfcNumbersPromise = getUnusableRfcNumbers()
    }
    return unusableRfcNumbersPromise
  }
})()
