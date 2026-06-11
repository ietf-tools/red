// @vitest-environment node
import { test, expect } from 'vitest'
import { metaThumbnailSlugToDimensions } from './meta-thumbnails'

test('metaThumbnailSlugToDimensions', () => {
  expect(metaThumbnailSlugToDimensions('')).toBe(undefined)
  expect(metaThumbnailSlugToDimensions('/\/\/\/\/')).toBe(undefined)

  expect(
    metaThumbnailSlugToDimensions(
      // note, not a valid dimension
      'rfc-editor-logo-1200x600.png'
    )
  ).toStrictEqual(undefined)

  expect(metaThumbnailSlugToDimensions('rfc-editor-logo-1200x630.png')).toStrictEqual([1200, 630])
})
