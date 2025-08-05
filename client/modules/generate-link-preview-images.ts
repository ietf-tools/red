/**
 * This file is responsible for generating link preview images
 */
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import type { ResizeOptions } from 'sharp'
import { defineNuxtModule, useLogger } from 'nuxt/kit'
import {
  imagePreviewDimensions,
  type ImagePreviewFilename
} from '../app/utilities/head'
import { assertIsNumber } from '../app/utilities/typescript'

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
