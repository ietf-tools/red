import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

const s3Cli = new S3Client({
  endpoint: process.env.S3_OUT_ENDPOINT ?? '',
  region: 'auto',
  credentials: {
    accessKeyId: process.env.S3_OUT_ACCESS_ID ?? '',
    secretAccessKey: process.env.S3_OUT_ACCESS_KEY ?? ''
  },
  requestChecksumCalculation: 'WHEN_REQUIRED',
  responseChecksumValidation: 'WHEN_REQUIRED'
})

type StreamingBlobPayloadInputTypes = ConstructorParameters<typeof PutObjectCommand>[0]["Body"]

export async function saveToS3(
  key: string,
  contents: StreamingBlobPayloadInputTypes
): Promise<void> {
  await s3Cli.send(
    new PutObjectCommand({
      Bucket: process.env.S3_OUT_BUCKET,
      Key: key,
      Body: contents
    })
  )
}

export const rfcJSONPathBuilder = (rfcNumber: number) => `rfc/${rfcNumber}.json` as const

export const rfcImageFileNameBuilder = (rfcNumber: number, pageNumber: number) => `${rfcNumber}-page-${pageNumber}.png` as const

export const rfcImagePathBuilder = (fileName: string) => `rfc/${fileName}` as const

export const HOMEPAGE_LATEST_PATH = `other/homepage-latest.json` as const

export const RFC_INDEX_TXT_PATH = 'other/rfc-index.txt' as const

export const RFC_FEED_RSS_PATH = 'other/rfcrss.xml' as const

export const RFC_FEED_ATOM_PATH = 'other/rfcatom.xml' as const