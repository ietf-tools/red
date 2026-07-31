import { PromisePool } from '@supercharge/promise-pool'
import { difference } from 'es-toolkit'

import { deleteFromS3, listS3Files, UNUSABLE_RFC_NUMBERS_PATH } from './s3.ts'
import { assertIsString } from './typescript.ts'

const GOOD_KEYS = [
  'other/bcp-index.txt',
  'other/std-index.txt',
  'other/fyi-index.txt',
  'other/rfc-index.txt',

  'other/rfc-index.xml',

  'other/april-first-rfc-numbers.json',

  'other/errata.json',

  'other/publication-std-levels.json',
  'other/reports/CurrQstats.txt',

  UNUSABLE_RFC_NUMBERS_PATH
]

// This is just a hint number, not a hard limit at all
const NUMBER_OF_CONCURRENT_S3_USAGES = 4

/**
 * Purges files that shouldn't exist on bucket
 */
export const cleanupRedBucket = async (uploadedKeys: string[]): Promise<boolean> => {
  console.log('[Cleanup] Now cleaning up Red bucket...')

  const existingBucketObjects = await listS3Files()
  const existingBucketKeys = existingBucketObjects.map((obj) => {
    assertIsString(obj.Key, `Bucket object ${JSON.stringify(obj)} has no key.`)
    return obj.Key
  })

  const existingBucketKeysToDelete = existingBucketKeys.filter((key) => {
    if (
      key.match(/^rfc-common\/\d+\.json$/) ||
      key.match(/^rfc-html\/meta-thumbnail-\d+\.png$/) ||
      key.match(/^rfc-html\/\d+\.json$/) ||
      key.match(/^rfc-json\/\d+\.json$/) ||
      key.match(/^other\/favicon-\d+x\d+\.png$/) ||
      key.match(/^rfc-ref\/\d+\.txt$/) ||
      key.match(/^rfc\/\d+\.json$/) ||
      key.match(/^thumbnail\/rfc\d+\.png$/) ||
      key.match(/^thumbnail\/rfc-editor-logo-\d+x\d+\.png$/) ||
      key.match(/^rfc\/\d+-page-\d+\.png$/) || // pdf page screenshots
      key.match(/^content\/*.?\.json$/)
    ) {
      return false
    }
    return true
  })

  const keysToPurge = difference(existingBucketKeysToDelete, [...uploadedKeys, ...GOOD_KEYS])

  if (keysToPurge.length > 0) {
    console.log(`[Cleanup] File storage purge of ${keysToPurge.length} object(s)`)
    const { results: purgeResults, errors: purgeErrors } = await PromisePool.for(keysToPurge)
      .withConcurrency(NUMBER_OF_CONCURRENT_S3_USAGES)
      .process(async (keyToPurge) => {
        try {
          if (keyToPurge.startsWith('other/nuxt-assets')) {
            // skip
          } else if (keyToPurge.startsWith('other/sitemap-')) {
            console.log('[Cleanup] will delete sitemap ', keyToPurge)
            await deleteFromS3(keyToPurge)
            console.log(`[Cleanup ${keyToPurge}] deleted successfully`)
          } else {
            console.log('[Cleanup] would delete ', keyToPurge)
            // await deleteFromS3(keyToPurge)
          }
          return true
        } catch (err) {
          console.error(`[Cleanup ${keyToPurge}] threw exception: ${String(err)}`)
          throw err
        }
        return false
      })

    if (purgeErrors.length > 0) {
      console.error('[Cleanup] There were errors purging files.', purgeErrors)
      console.error("[Cleanup] Bucket retains files that it shouldn't. This is bad. Cannot continue.")
      return false
    }

    return purgeResults.every((result) => result)
  } else {
    console.log('[Cleanup] No need to purge any files from S3.')
    return true
  }
}
