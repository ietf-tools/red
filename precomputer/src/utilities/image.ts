import sharp, { type ResizeOptions } from 'sharp'

type SharpImage = ReturnType<typeof sharp>

/**
 * Detects whether an image is greyscale.
 *
 * Useful to know whether it's safe to compress an image down to 1 channel from 3 channels
 */
export const isSharpImageGreyscale = async (sharpImage: SharpImage): Promise<boolean> => {
  const greyscaleThreshold = 1

  try {
    // Get image metadata first
    const metadata = await sharpImage.metadata()

    // If image has only one channel, it's definitely grayscale
    if (metadata.channels === 1) {
      return true
    }

    // For images with multiple channels, we need to check if all channels are identical
    const { data, info } = await sharpImage.raw().toBuffer({ resolveWithObject: true })

    const width = info.width
    const height = info.height

    // Compare RGB values across all pixels, sequentially...
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const offset = (y * width + x) * metadata.channels
        const r = data[offset]
        const g = data[offset + 1]
        const b = data[offset + 2]

        // If RGB values differ by more than a tiny threshold (accounting for potential compression artifacts)
        if (Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(b - r)) > greyscaleThreshold) {
          return false
        }
      }
    }

    return true
  } catch (error: unknown) {
    console.error(error)
    throw new Error(
      `Failed to check if image is grayscale: ${
        error && typeof error === 'object' && 'message' in error ? error.message : error
      }`
    )
  }
}

type CompressImageToPngProps = {
  sharpImage: SharpImage
  mode: 'compress' | 'compress-greyscale'
  widthPx: number
  heightPx?: number
  debugPrefix: string
}

export const compressImageToPng = async ({
  sharpImage,
  mode,
  widthPx,
  heightPx,
  debugPrefix
}: CompressImageToPngProps): Promise<{ png: Buffer; widthPx: number; heightPx: number }> => {
  let sharp = sharpImage
    /**
     * The PDF of RFC 8 page 9 has EXIF rotate metadata that we need to obey
     * or else the Sharp extract coordinates are off canvas
     */
    .autoOrient() // auto-rotates if EXIF data etc say it should and then removes the Exif flag from it's in-memory metadata so it won't appear in output

  let metadata = await sharp.metadata()

  const resizeOptions: ResizeOptions = { width: metadata.width, height: metadata.height }
  const compressionLevel = 9

  if (mode === 'compress-greyscale') {
    sharp = sharp.greyscale(true)
  }

  sharp = sharp.resize(resizeOptions)

  // if heightPx was undefined we'll need to get the new calculated height and return it
  metadata = await sharp.metadata()

  try {
    const png = await sharp
      .resize(resizeOptions)
      .png(
        mode === 'compress'
          ? { compressionLevel }
          : {
              compressionLevel,
              colours:
                // 64 greys oughta be enough for anyone
                64
            }
      )
      .toBuffer()

    return {
      png,
      widthPx: metadata.width,
      heightPx: metadata.height
    }
  } catch (e) {
    console.error(
      '[UNPDF_ERROR]',
      debugPrefix,
      JSON.stringify(resizeOptions),
      `${widthPx}x${heightPx}`,
      ' vs ',
      `${metadata.width}x${metadata.height}`,
      e
    )
    throw e
  }
}
