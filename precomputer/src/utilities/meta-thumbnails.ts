/**
 * This file is responsible for generating image PNGs for <meta name="image" content="..." /> links
 */
import fsPromises from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { metaThumbnailPathBuilder, saveToS3 } from './s3.ts'
import { type AsyncTaskItem } from './task.ts'

const __dirname = import.meta.dirname
const precomputerRoot = path.resolve(__dirname, '..', '..')
const linkPreviewImageDefaultPath = path.resolve(precomputerRoot, 'src', 'assets', 'meta-thumbnail.svg')

const FILENAME_PREFIX = 'rfc-editor-logo-' as const
const FILENAME_SUFFIX = '.png' as const
export const OPENGRAPH_DIMENSIONS = [1200, 630]
export const TWITTER_DIMENSIONS = [1200, 675]
export const imagePreviewDimensions = [
  OPENGRAPH_DIMENSIONS, // OpenGraph (Facebook)
  TWITTER_DIMENSIONS // Twitter
] as const
export type ImagePreviewFilename =
  `${typeof FILENAME_PREFIX}${(typeof imagePreviewDimensions)[number][0]}x${(typeof imagePreviewDimensions)[number][1]}${typeof FILENAME_SUFFIX}`

export const metaThumbnailSlugToDimensions = (slug: string): [number, number] | undefined => {
  if (!slug.startsWith(FILENAME_PREFIX) || !slug.endsWith(FILENAME_SUFFIX)) {
    return undefined
  }
  const dimensions = slug.match(/(\d+)x(\d+)/)
  if (!dimensions) {
    return undefined
  }
  const widthPx = parseInt(dimensions[1], 10)
  const heightPx = parseInt(dimensions[2], 10)
  const expectedSlug: ImagePreviewFilename = `${FILENAME_PREFIX}${widthPx}x${heightPx}${FILENAME_SUFFIX}`
  if (slug !== expectedSlug) {
    console.warn('Received slug ', slug, ' but expected', expectedSlug)
    return undefined
  }
  if (
    !imagePreviewDimensions.some(
      (imagePreviewDimension) => widthPx === imagePreviewDimension[0] && heightPx === imagePreviewDimension[1]
    )
  ) {
    return undefined
  }
  return [widthPx, heightPx]
}

const compressionLevel = 9

export const uploadMetaThumbnails = async (): AsyncTaskItem => {
  return await Promise.all(
    imagePreviewDimensions.map(async (imagePreviewDimension) => {
      const metaThumbnail = await getMetaThumbnail(imagePreviewDimension[0], imagePreviewDimension[1])
      const s3Key = metaThumbnailPathBuilder(metaThumbnail.filename)
      saveToS3(s3Key, metaThumbnail.pngBuffer)
      console.log('[meta-thumbnail]', 'Uploaded', s3Key)
      return s3Key
    })
  )
}

export const bgBlue = '#002d3c'

const svgPromise = fsPromises.readFile(linkPreviewImageDefaultPath, 'utf-8')

export const getMetaThumbnail = async (widthPx: number, heightPx: number) => {
  const svgString = await svgPromise
  const paddingPx = Math.round(widthPx / 10)
  const pngBuffer = await sharp(Buffer.from(svgString))
    .resize(widthPx - paddingPx * 2, heightPx - paddingPx * 2, {
      fit: 'contain',
      background: bgBlue
    })
    .extend({
      top: paddingPx,
      right: paddingPx,
      bottom: paddingPx,
      left: paddingPx,
      background: bgBlue
    })
    .flatten({
      background: bgBlue
    })
    .png({ compressionLevel })
    .toBuffer()

  const filename: ImagePreviewFilename = `rfc-editor-logo-${widthPx}x${heightPx}.png`

  return {
    filename,
    pngBuffer
  }
}
