// loads homepage
import { describe, expect, test } from 'vitest'
import { createPage } from '@nuxt/test-utils/e2e'
import { expectScreenshotToMatchBaseline } from './utilities/screenshot'
import { setupNuxtServer } from './utilities/setup'

const HOMEPAGE_TEST_DURATION_MS = 30_000

// An explicit viewport keeps the screenshot's layout independent of whatever default
// the browser context happens to supply.
const VIEWPORT = { width: 1280, height: 720 }

// The Latest RFCs list is live API data: its entries change whenever an RFC is
// published, and because it sits above the rest of the page any change in card height
// would shift every section below it. Hiding it and pinning the block to a fixed
// height excludes the volatile content while holding the rest of the page steady.
const LATEST_RFCS_MASK_CSS = `
  ul[aria-describedby="latest-rfcs-heading"] {
    visibility: hidden;
    height: 320px;
    overflow: hidden;
  }
`

describe('homepage', async () => {
  await setupNuxtServer()

  test(
    'loads homepage',
    async () => {
      const page = await createPage('/')
      await page.setViewportSize(VIEWPORT)

      // The document responded and rendered a non-empty title.
      expect(await page.title()).toBeTruthy()

      // The page hydrated and rendered its primary content.
      await page.locator('text=Latest RFCs').first().waitFor({ state: 'visible' })

      await expectScreenshotToMatchBaseline(page, 'homepage', { maskCss: LATEST_RFCS_MASK_CSS })

      await page.close()
    },
    HOMEPAGE_TEST_DURATION_MS
  )
})
