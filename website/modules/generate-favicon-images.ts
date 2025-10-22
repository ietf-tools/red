/**
 * This file is responsible for generating favicon images
 */
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import type { ResizeOptions } from 'sharp'
import { defineNuxtModule, useLogger } from 'nuxt/kit'

const __dirname = import.meta.dirname
const clientPath = path.resolve(__dirname, '..')
const faviconSvgSourcePath = path.resolve(
  clientPath,
  'app',
  'assets',
  'favicon.svg'
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

// Sync changes to head.ts
const FAVICON_DIMENSIONS: [number, number][] = [
    [16, 16],
    [32, 32],
    [48, 48],
    [180, 180],
    [192, 192],
    [512, 512],
]

const regenerateFavIconImages = async (logger?: Logger) => {
  await Promise.all(
    FAVICON_DIMENSIONS.map(([width, height]) => {
      assertIsNumber(width)
      assertIsNumber(height)
      const readableStream = fs.createReadStream(faviconSvgSourcePath, {
        encoding: 'utf8'
      })
      // if you change this sync the changes to url.ts's faviconPathBuilder()
      const filename = `favicon-${width}x${height}.png`
      const writableStream = fs.createWriteStream(
        path.resolve(publicPath, filename)
      )
      const paddingPx = Math.round(width / 50)
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
    const logger = useLogger('generate-favicon-images', {
      level: options.quiet ? 0 : 3
    })
    regenerateFavIconImages(logger)
  }
})

// Create the file(s) initially on Nuxt load so there aren't import errors on CI
await regenerateFavIconImages()
