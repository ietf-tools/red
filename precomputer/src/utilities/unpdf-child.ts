import { z } from 'zod'
import sharp from 'sharp'
import { renderPageAsImage, extractText } from 'unpdf'
import { rfcImagePathBuilder, saveToS3 } from './s3.ts'
import { compressImageToPng, isSharpImageGreyscale } from './image.ts'
import { ImageDimensions, OPENGRAPH_IMAGE_DIMENSIONS } from './html.ts'

process.on('message', async (messageFromParent: unknown) => {
  const message = parseMessageFromParent(messageFromParent)
  if (message === null) return
  // console.log(' - PDF was', message.base64Data.length)
  switch (message.type) {
    case 'SCREENSHOT_PAGE':
      const { screenshotDimensions, base64 } = await screenshotAndUpload(
        message.base64Data,
        message.pageNumber,
        message.fileName,
        message.shouldUploadToS3 === true.toString(),
        message.dimensions,
      )
      send({ type: 'SCREENSHOT_PAGE_DONE', screenshotDimensions, base64 })
      break
    case 'GET_TEXT':
      const text = await getText(message.base64Data)
      send({ type: 'GET_TEXT_DONE', text })
      break
  }
})

const screenshotAndUpload = async (
  base64Data: string,
  pageNumber: number,
  fileName: string,
  shouldUploadToS3: boolean,
  dimensions: ImageDimensions
): Promise<Pick<ScreenshotPageDone, 'screenshotDimensions' | 'base64'>> => {
  const blob = parseBase64Data(base64Data)
  // console.log('- CHILD before', blob.byteLength)
  const screenshot = await renderPageAsImage(blob, pageNumber, {
    canvasImport: () => import('@napi-rs/canvas'),
    scale: 1,
    width: dimensions.widthPx,
    height: dimensions.heightPx
  })
  const sharpImage = sharp(screenshot)
  const metadata = await sharpImage.metadata()
  const isGreyscale = await isSharpImageGreyscale(sharpImage)
  const png = await compressImageToPng(sharpImage, isGreyscale ? 'compress-greyscale' : 'compress')
  if (shouldUploadToS3) {
    const bucketPath = rfcImagePathBuilder(fileName)
    await saveToS3(bucketPath, png)
    // console.log(` - uploaded screenshot of page ${pageNumber} to ${bucketPath}`)
  }
  const base64 = png.toString('base64');
  return {
    screenshotDimensions: { widthPx: metadata.width, heightPx: metadata.height },
    base64
  }
}

const getText = async (base64Data: string) => {
  const blob = parseBase64Data(base64Data)
  // console.log('- CHILD before', blob.byteLength)
  return extractText(blob, { mergePages: false })
}

const ScreenshotPageSchema = z.object({
  type: z.literal('SCREENSHOT_PAGE'),
  fileName: z.string(),
  pageNumber: z.number(),
  base64Data: z.string(),
  shouldUploadToS3: z.string(),
  dimensions: z.object({
    widthPx: z.number(),
    heightPx: z.number().optional()
  })
})

const TextSchema = z.object({
  type: z.literal('GET_TEXT'),
  base64Data: z.string()
})

const ReceiveMessageSchema = z.union([ScreenshotPageSchema, TextSchema])

export type ReceiveMessage = z.infer<typeof ReceiveMessageSchema>

const parseMessageFromParent = (message: unknown) => {
  const { data: parsedMessage, error } = ReceiveMessageSchema.safeParse(message)
  if (error) {
    console.error('CHILD expected valid message.', error)
    return null
  }
  if (parsedMessage.base64Data.length === 0) {
    console.error('CHILD expected PDF length but was 0')
    return null
  }
  return parsedMessage
}

type Text = {
  // the typescript to extract individual overload signatures of getText
  // is far more complicated than just hardcoding the type we want
  totalPages: number
  text: string[]
}

type ScreenshotPageDone = { type: 'SCREENSHOT_PAGE_DONE', screenshotDimensions: ImageDimensions, base64?: string }

type SendMessages =
  | { type: 'READY' }
  | ScreenshotPageDone
  | { type: 'GET_TEXT_DONE'; text: Text }

const send = (msg: SendMessages) => {
  if (process.send) {
    process.send(msg)
  } else {
    console.error('should be fork() child')
  }
}

const parseBase64Data = (base64: string) => {
  // console.log(
  //   ' - CHILD parsing',
  //   base64.substring(0, 100),
  //   base64.substring(0, 100)
  // )
  const buffer = Buffer.from(base64, 'base64')
  const uint8Array = new Uint8Array(buffer.buffer)
  // console.log(' - CHILD buffer', buffer.byteLength)
  return uint8Array
}

send({ type: 'READY' })
