import sharp from 'sharp'
import satori from 'satori';

type Dimensions = {
  widthPx: number,
  heightPx: number,
}

/**
 * Renders an HTML string to PNG
 */
export const renderHtmlToImage = async (htmlString: string, dimensions: Dimensions): Promise<Buffer | undefined> => {
  const svgString = await satori(
    htmlString,
    {
      width: dimensions.widthPx,
      height: dimensions.heightPx,
      fonts: []
    },
  )

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
