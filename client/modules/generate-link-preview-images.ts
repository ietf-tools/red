/**
 * This file is responsible for generating link preview images
 */
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import type { ResizeOptions } from 'sharp'
import { defineNuxtModule, useLogger } from 'nuxt/kit'

const __dirname = import.meta.dirname
const clientPath = path.resolve(__dirname, '..')
const linkPreviewImageDefault = path.resolve(
  clientPath,
  'app',
  'assets',
  'link-preview-image-default.svg'
)
const publicPath = path.resolve(clientPath, 'public')
const transparent: ResizeOptions['background'] = { r: 0, g: 0, b: 0, alpha: 0 }

type Logger = ReturnType<typeof useLogger>

export function assertIsNumber(val: unknown): asserts val is number {
  if (typeof val !== 'number') {
    throw new Error(`Not a number typeof=${typeof val} "${val}"`)
  }
  if (Number.isNaN(val)) {
    throw new Error(`Was a NaN typeof=${typeof val} "${val}"`)
  }
}

// Sync changes to shared/utils/meta-preview-images.ts
export const OPENGRAPH_DIMENSIONS = [1200, 630]
export const TWITTER_DIMENSIONS = [1200, 675]
export const imagePreviewDimensions = [
  OPENGRAPH_DIMENSIONS, // OpenGraph (Facebook)
  TWITTER_DIMENSIONS // Twitter
] as const
export type ImagePreviewFilename =
  `link-preview-image-${(typeof imagePreviewDimensions)[number][0]}x${(typeof imagePreviewDimensions)[number][1]}.png`

const regenerateLinkPreviewImages = async (logger?: Logger) => {
  await Promise.all(
    imagePreviewDimensions.map(([width, height]) => {
      assertIsNumber(width)
      assertIsNumber(height)
      const readableStream = fs.createReadStream(linkPreviewImageDefault, {
        encoding: 'utf8'
      })
      const filename: ImagePreviewFilename = `link-preview-image-${width}x${height}.png`
      const writableStream = fs.createWriteStream(
        path.resolve(publicPath, filename)
      )
      const paddingPx = Math.round(width / 10)
      const transformer = sharp()
        .resize(width - paddingPx * 2, height - paddingPx * 2, {
          fit: 'contain',
          background: transparent
        })
        .extend({
          top: paddingPx,
          right: paddingPx,
          bottom: paddingPx,
          left: paddingPx,
          background: transparent
        })
      readableStream.pipe(transformer).pipe(writableStream)
      logger?.info(` - regenerated ${path.basename(filename)}`)
    })
  )
}

export default defineNuxtModule({
  setup(options, _nuxt) {
    const logger = useLogger('generate-link-preview-images', {
      level: options.quiet ? 0 : 3
    })
    regenerateLinkPreviewImages(logger)
  }
})

// Create the file(s) initially on Nuxt load so there aren't import errors on CI
await regenerateLinkPreviewImages()
