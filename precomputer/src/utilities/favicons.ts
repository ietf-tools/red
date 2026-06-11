/**
 * This file is responsible for generating favicon images
 */
import fsPromises from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import type { ResizeOptions } from 'sharp'
import { faviconPathBuilder, saveToS3 } from './s3.ts'
import { type AsyncTaskItem } from './task.ts'

const __dirname = import.meta.dirname
const clientPath = path.resolve(__dirname, '..', '..')
const faviconSvgSourcePath = path.resolve(clientPath, 'src', 'assets', 'favicon.svg')

const transparent: ResizeOptions['background'] = { r: 0, g: 0, b: 0, alpha: 0 }

export function assertIsNumber(val: unknown): asserts val is number {
  if (typeof val !== 'number') {
    throw new Error(`Not a number typeof=${typeof val} "${val}"`)
  }
  if (Number.isNaN(val)) {
    throw new Error(`Was a NaN typeof=${typeof val} "${val}"`)
  }
}

const compressionLevel = 9

const FAVICON_DIMENSIONS: [number, number][] = [
  [16, 16],
  [32, 32],
  [48, 48],
  [180, 180],
  [192, 192],
  [512, 512]
]

export const uploadFavicons = async (): AsyncTaskItem => {
  return await Promise.all(
    FAVICON_DIMENSIONS.map(async (dimension) => {
      const pngBuffer = await getFavIconImage(dimension[0], dimension[1])
      const s3Key = faviconPathBuilder(dimension[0], dimension[1])
      saveToS3(s3Key, pngBuffer)
      console.log('[favicon]', 'Uploaded', s3Key)
      return s3Key
    })
  )
}

const svgPromise = fsPromises.readFile(faviconSvgSourcePath, 'utf-8')

export const getFavIconImage = async (widthPx: number, heightPx: number) => {
  assertIsNumber(widthPx)
  assertIsNumber(heightPx)
  const svgString = await svgPromise

  const paddingPx = Math.round(widthPx / 50)
  const pngBuffer = await sharp(Buffer.from(svgString))
    .resize(widthPx - paddingPx * 2, heightPx - paddingPx * 2, {
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
    .png({ compressionLevel })
    .toBuffer()

  return pngBuffer
}
