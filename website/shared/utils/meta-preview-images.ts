// Sync changes to modules/generate-link-preview-images.ts
export const OPENGRAPH_DIMENSIONS = [1200, 630] as const
export const TWITTER_DIMENSIONS = [1200, 675] as const
export const imagePreviewDimensions = [
  OPENGRAPH_DIMENSIONS, // OpenGraph (Facebook)
  TWITTER_DIMENSIONS // Twitter
] as const
export type ImagePreviewHorizontalDimensions =
  (typeof imagePreviewDimensions)[number][0]
export type ImagePreviewVerticalDimensions =
  (typeof imagePreviewDimensions)[number][1]
export type ImagePreviewFilename =
  `link-preview-image-${ImagePreviewHorizontalDimensions}x${ImagePreviewVerticalDimensions}.png`
