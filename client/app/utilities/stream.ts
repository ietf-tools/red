import { getRedClient } from './redClientWrappers'
import type { ApiClient } from '~/generated/red-client'

type StreamingHandler = (handlerParams: {
  push: (data: string) => void
  close: () => Promise<void>
  abortController: AbortController
  redApi: ApiClient
}) => void

export const getStreamingResponse = (
  streamingHandler: StreamingHandler
): ReadableStream => {
  const abortController = new AbortController()

  const stream = new ReadableStream({
    start(controller) {
      const push = (data: string): void => {
        if (abortController.signal.aborted) {
          // ignore
          return
        }
        controller.enqueue(data)
      }

      const close = async () => {
        abortController.abort()
        controller.close()
      }

      const redApi = getRedClient()

      void streamingHandler({
        push,
        close,
        abortController,
        redApi
      })
    },
    cancel() {
      abortController.abort()
    }
  })

  return stream
}

export const bufferStreamingResponse = async (
  streamingHandler: StreamingHandler
): Promise<string> => {
  const abortController = new AbortController()

  return new Promise((resolve) => {
    const buffer: string[] = []

    const push = (data: string): void => {
      if (abortController.signal.aborted) {
        // ignore
        return
      }
      buffer.push(data)
    }

    const close = async () => {
      abortController.abort()
      resolve(buffer.join(''))
    }

    const redApi = getRedClient()

    void streamingHandler({
      push,
      close,
      abortController,
      redApi
    })
  })
}
