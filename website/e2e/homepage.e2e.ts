// loads homepage
import { describe, expect, test } from 'vitest'
import { createPage, setup } from '@nuxt/test-utils/e2e'

const HOMEPAGE_TEST_DURATION_MS = 15_000

describe('homepage', async () => {
  // `dev: true` runs the Nuxt dev server so the `$development` route rules in
  // nuxt.config.ts apply (notably the `/api/v1/**` proxy the app needs to work).
  await setup({ browser: true, dev: true })

  test(
    'loads homepage',
    async () => {
      const page = await createPage('/')

      // The document responded and rendered a non-empty title.
      expect(await page.title()).toBeTruthy()

      // The page hydrated and rendered its primary content.
      await page.locator('text=Latest RFCs').first().waitFor({ state: 'visible' })

      await page.close()
    },
    HOMEPAGE_TEST_DURATION_MS
  )
})
