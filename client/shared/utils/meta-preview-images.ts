// Sync changes to modules/generate-link-preview-images.ts
export const OPENGRAPH_DIMENSIONS = [1200, 630]
export const TWITTER_DIMENSIONS = [1200, 675]
export const imagePreviewDimensions = [
  OPENGRAPH_DIMENSIONS, // OpenGraph (Facebook)
  TWITTER_DIMENSIONS // Twitter
] as const
export type ImagePreviewFilename =
  `link-preview-image-${(typeof imagePreviewDimensions)[number][0]}x${(typeof imagePreviewDimensions)[number][1]}.png`
