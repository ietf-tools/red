import path from 'path'
import fsPromises from 'fs/promises'
import sharp from 'sharp'
import satori, { type SatoriOptions } from 'satori'
import { html } from 'satori-html'

type Dimensions = {
  widthPx: number,
  heightPx: number,
}

const fontsPath = path.resolve(import.meta.dirname, '..', 'fonts')

const dejavuSansPath = path.join(fontsPath, 'DejaVuSans.ttf')
const dejavuSansBinary = fsPromises.readFile(dejavuSansPath)

const dejavuSansBoldPath = path.join(fontsPath, 'DejaVuSans-Bold.ttf')
const dejavuSansBoldBinary = fsPromises.readFile(dejavuSansBoldPath)

const dejavuSansMonoPath = path.join(fontsPath, 'DejaVuSansMono.ttf')
const dejavuSansMonoBinary = fsPromises.readFile(dejavuSansMonoPath)

const dejavuSansItalicPath = path.join(fontsPath, 'DejaVuSans-Oblique.ttf')
const dejavuSansItalicBinary = fsPromises.readFile(dejavuSansItalicPath)

// https://github.com/vercel/satori/issues/590
const cacheOfSatoriOptions: Record<string, SatoriOptions> = {}

/**
 * Renders an HTML string to PNG
 */
export const renderHtmlToImage = async (htmlString: string, dimensions: Dimensions): Promise<Buffer | undefined> => {
  const cacheKey = `${dimensions.widthPx}x${dimensions.heightPx}`
  if (!cacheOfSatoriOptions[cacheKey]) {
    cacheOfSatoriOptions[cacheKey] = {
      width: dimensions.widthPx,
      height: dimensions.heightPx,
      fonts: [
        {
          name: 'sans-serif',
          data: await dejavuSansBinary,
          weight: 400,
          style: 'normal',
        },
        {
          name: 'sans-serif',
          data: await dejavuSansBoldBinary,
          weight: 700,
          style: 'normal',
        },
        {
          name: 'sans-serif',
          data: await dejavuSansItalicBinary,
          weight: 400,
          style: 'italic',
        },
        {
          name: 'monospace',
          data: await dejavuSansMonoBinary,
          weight: 400,
          style: 'normal',
        },
      ],
    }
  }
  const svgString = await satori(
    html(htmlString),
    cacheOfSatoriOptions[cacheKey],
  )
  console.log("Generated SVG of ", svgString.substring(0, 100), '...')
  try {
    const result = await sharp(Buffer.from(svgString))
      .withMetadata({ density: 300 })
      .png()
      .toBuffer()

    return result
  } catch (error) {
    console.error('Error converting SVG:', error);
  }
}
