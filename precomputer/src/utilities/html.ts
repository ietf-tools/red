import { z } from 'zod'

export const ImageDimensionsSchema = z.object({
  widthPx: z.number(),
  heightPx: z.number()
})

export type ImageDimensions = z.infer<typeof ImageDimensionsSchema>

export type ImageDimensionsOptionalHeight = {
  widthPx: number, 
  heightPx?: number
}

export const OPENGRAPH_IMAGE_DIMENSIONS: ImageDimensions = {
  widthPx: 1200,
  heightPx: 600
}