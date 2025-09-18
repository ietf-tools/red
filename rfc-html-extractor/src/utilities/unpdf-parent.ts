import { z } from 'zod'
import { fork } from 'node:child_process'
import { join } from 'node:path'
import { gc } from './gc.ts'
import { sleep } from './sleep.ts'
import type { ChildProcess } from 'node:child_process'

/**
 * Something in unpdf seems to leak memory, so taking eg 10 screenshots
 * of pages will cause heap overflow.
 * This wrapper uses a fork to isolate unpdf and then kill the process.
 */

const forkPath = join(import.meta.dirname, 'unpdf-child.ts')

type ForkOptions = NonNullable<Parameters<typeof fork>[2]>
const forkArgs: ForkOptions = { silent: true }

export const takeScreenshotOfPage = async (
  base64: string,
  pageNumber: number,
  fileName: string,
  shouldUploadToS3: boolean
): Promise<ImageDimensions> => {
  return new Promise((resolve) => {
    const child = fork(forkPath, forkArgs)
    child.on('message', async (_message) => {
      const message = parseMessageFromChild(_message)
      if (!message) {
        return
      }
      switch (message.type) {
        case 'READY':
          child.send({
            type: 'SCREENSHOT_PAGE',
            base64Data: base64,
            pageNumber,
            fileName,
            shouldUploadToS3: shouldUploadToS3.toString()
          })
          break
        case 'SCREENSHOT_PAGE_DONE':
          await cleanupChild(child)
          resolve(message.screenshotDimensions)
          break
        case 'GET_TEXT_DONE':
          throw Error('Unexpected message while taking screenshot')
      }
    })
    handlePipes(child)
  })
}

export const getTextDetails = async (
  base64: string
): Promise<z.infer<typeof GetTextSchema>> => {
  return new Promise((resolve) => {
    const child = fork(forkPath, forkArgs)
    child.on('message', async (_message) => {
      const message = parseMessageFromChild(_message)
      if (!message) {
        return
      }
      switch (message.type) {
        case 'READY':
          child.send({
            type: 'GET_TEXT',
            base64Data: base64
          })
          break
        case 'GET_TEXT_DONE':
          await cleanupChild(child)
          resolve(message)
          break
        case 'SCREENSHOT_PAGE_DONE':
          throw Error('Unexpected message while getting text')
      }
    })
    handlePipes(child)
  })
}

const GetTextSchema = z.object({
  type: z.literal('GET_TEXT_DONE'),
  text: z.object({
    totalPages: z.number(),
    text: z.string().array()
  })
})

const ImageDimensionsSchema = z.object({
  widthPx: z.number(),
  heightPx: z.number()
})

type ImageDimensions = z.infer<typeof ImageDimensionsSchema>

const ReceiveMessagesSchema = z.union([
  z.object({
    type: z.literal('READY')
  }),
  z.object({
    type: z.literal('SCREENSHOT_PAGE_DONE'),
    screenshotDimensions: ImageDimensionsSchema
  }),
  GetTextSchema
])

const parseMessageFromChild = (message: unknown) => {
  const { data: parsedMessage, error } =
    ReceiveMessagesSchema.safeParse(message)
  if (error) {
    console.error('PARENT expected valid message.', error)
    return null
  }
  return parsedMessage
}

const cleanupChild = async (child: ChildProcess) => {
  await sleep(50)

  // Remove all event listeners
  child.removeAllListeners()
  // Disconnect IPC channel
  child.disconnect()

  // Call unref if process is detached
  if (process.platform !== 'win32') {
    child.unref()
  }

  child.kill('SIGTERM')

  // The following code seems to make the current (parent) process exit.
  //
  // Wait for exit
  // await new Promise((resolve) => {
  //   child.once('exit', resolve)
  // })

  await gc()
}

const handlePipes = (child: ChildProcess) => {
  child.stdout?.on('data', (data) => {
    const txt = data.toString()
    const messagesToSupress = [
      // This message from unpdf/pdfjs is noted but we wish to suppress it to make logs easier to read
      // all other messages will be printed in logs
      'Warning: Please use the `legacy` build in Node.js environments.'
    ]
    if (
      messagesToSupress.some((messageToSupress) =>
        txt.includes(messageToSupress)
      )
    ) {
      return
    }
    console.log('STDOUT: unpdf child', txt)
  })
  child.stderr?.on('data', (data) => {
    const txt = data.toString()
    console.log('STDERR: unpdf child', txt)
  })
}
