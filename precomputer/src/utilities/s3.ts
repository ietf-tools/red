import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand
} from '@aws-sdk/client-s3'
import type { SubseriesCommon } from '../../../website/app/utilities/rfc-validators.ts'
import { assertIsString } from './typescript.ts'

let s3Ref: undefined | { s3RfcCli: S3Client; s3RedCli: S3Client } = undefined

const getS3Singleton = () => {
  if (!s3Ref) {
    const S3_RFC_ENDPOINT = process.env.S3_RFC_ENDPOINT
    const S3_RFC_ACCESS_ID = process.env.S3_RFC_ACCESS_ID
    const S3_RFC_ACCESS_KEY = process.env.S3_RFC_ACCESS_KEY
    assertIsString(
      S3_RFC_ENDPOINT,
      `process.env.S3_RFC_ENDPOINT wasn't a string. Was ${typeof S3_RFC_ENDPOINT}`
    )
    assertIsString(
      S3_RFC_ACCESS_ID,
      `process.env.S3_RFC_ACCESS_ID wasn't a string. Was ${typeof S3_RFC_ACCESS_ID}`
    )
    assertIsString(
      S3_RFC_ACCESS_KEY,
      `process.env.S3_RFC_ACCESS_KEY wasn't a string. Was ${typeof S3_RFC_ACCESS_KEY}`
    )

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
    assertIsString(
      S3_RED_ENDPOINT,
      `process.env.S3_RED_ENDPOINT wasn't a string. Was ${typeof S3_RED_ENDPOINT}`
    )
    assertIsString(
      S3_RED_ACCESS_ID,
      `process.env.S3_RED_ACCESS_ID wasn't a string. Was ${typeof S3_RED_ACCESS_ID}`
    )
    assertIsString(
      S3_RED_ACCESS_KEY,
      `process.env.S3_RED_ACCESS_KEY wasn't a string. Was ${typeof S3_RED_ACCESS_KEY}`
    )

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
  outputType?: S3OutputType
): Promise<string | Uint8Array | null> {
  const S3_BUCKET =
    bucket === 'S3_RFC_BUCKET' ?
      process.env.S3_RFC_BUCKET
      : process.env.S3_RED_BUCKET
  assertIsString(
    S3_BUCKET,
    `process.env.${bucket} wasn't a string. Was ${typeof S3_BUCKET}`
  )

  const { s3RedCli, s3RfcCli } = getS3Singleton()

  const s3Client = bucket === 'S3_RFC_BUCKET' ? s3RfcCli : s3RedCli

  try {
    const resp = await s3Client.send(
      new GetObjectCommand({
        Bucket: S3_BUCKET,
        Key: key
      })
    )
    switch (outputType) {
      case 'base64': {
        return (await resp.Body?.transformToString('base64')) ?? null
      }
      default: {
        return (await resp.Body?.transformToString()) ?? null
      }
    }
  } catch (err) {
    const errorHeader = `Failed to fetch ${JSON.stringify(key)} from ${JSON.stringify(S3_BUCKET)} bucket.`
    console.error(errorHeader, err)
    return null
  }
}

type StreamingBlobPayloadInputTypes = ConstructorParameters<
  typeof PutObjectCommand
>[0]['Body']

export async function saveToS3(
  key: string,
  contents: StreamingBlobPayloadInputTypes
): Promise<void> {
  const S3_RED_BUCKET = process.env.S3_RED_BUCKET
  assertIsString(
    S3_RED_BUCKET,
    `process.env.S3_RED_BUCKET wasn't a string. Was ${typeof S3_RED_BUCKET}`
  )
  // console.log(`[${S3_RED_BUCKET}] saving ${key}`, ' with contents ', contents)
  const { s3RedCli } = getS3Singleton()
  await s3RedCli.send(
    new PutObjectCommand({
      Bucket: S3_RED_BUCKET,
      Key: key,
      Body: contents
    })
  )
}

export const rfcCommonPathBuilder = (rfcNumber: number) =>
  `rfc-common/${rfcNumber}.json` as const

export const rfcHtmlJsonPathBuilder = (rfcNumber: number) =>
  `rfc/${rfcNumber}.json` as const

export const rfcRefPathBuilder = (rfcNumber: number) =>
  `rfc-ref/${rfcNumber}.txt` as const

export const rfcImageFileNameBuilder = (
  rfcNumber: number,
  pageNumber: number
) => `${rfcNumber}-page-${pageNumber}.png` as const

export const rfcImagePathBuilder = (fileName: string) =>
  `rfc/${fileName}` as const

export const rfcBucketHtmlPathBuilder = (rfcNumber: number) => `html/rfc${rfcNumber}.html`

export const rfcMetaThumbnailPathBuilder = (rfcNumber: number) => `thumbnail/rfc${rfcNumber}.png` as const

export const metaThumbnailPathBuilder = (fileName: string) => `thumbnail/${fileName}` as const

export const faviconPathBuilder = (widthPx: number, heightPx: number) => `other/favicon-${widthPx}x${heightPx}.png` as const

export const subseriesInfoPathBuilder = (
  subseriesType: SubseriesCommon['type'],
  subseriesNumber: SubseriesCommon['number']
) => `subseries/${subseriesType}${subseriesNumber}.json` as const

export const ROBOTS_TXT_PATH = 'other/robots.txt' as const

export const HOMEPAGE_LATEST_PATH = `other/homepage-latest.json` as const

export const RFC_INDEX_TXT_PATH = 'other/rfc-index.txt' as const

export const RFC_INDEX_XML_PATH = 'other/rfc-index.xml' as const

export const RFC_MINI_INDEX_JSON_PATH = 'other/rfc-mini-index.json' as const

export const RFC_INDEX_XSD_PATH = 'other/rfc-index.xsd' as const

export const RFC_FEED_RSS_PATH = 'other/rfcrss.xml' as const

export const RFC_FEED_ATOM_PATH = 'other/rfcatom.xml' as const

export const IN_NOTES_RFC_REF_DOT_TXT_PATH =
  'other/in-notes/rfc-ref.txt' as const

export const ERRATA_JSON_PATH = 'other/errata.json' as const

export const REPORTS_CURRENT_QUEUE_STATS_DOT_TXT_PATH =
  'other/reports/CurrQstats.txt'

export const siteMapXmlPathPrefixBuilder = (sitemapFilename: string) => {
  return `other${sitemapFilename}` as const
}