// Checks against a deployed site rather than a server this repo starts, so they stay out of
// `test:e2e` and CI. Run with `npm run test:e2e:deployed`.
//
//   DEPLOYED_BASE_URL=https://staging.example npm run test:e2e:deployed   (default: production)

import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { chromium } from 'playwright-core'
import type { Browser } from 'playwright-core'

const BASE_URL = process.env.DEPLOYED_BASE_URL ?? 'https://www.rfc-editor.org'

const ANALYTICS_HOST = 'analytics.ietf.org'

const PAGE_LOAD_TIMEOUT_MS = 30_000

describe(`deployed site ${BASE_URL}`, () => {
  let browser: Browser

  beforeAll(async () => {
    browser = await chromium.launch()
  })

  afterAll(async () => {
    await browser.close()
  })

  test.each(['bcp 9', 'std 9', 'fyi 9'])(
    'searching for "%s" shows the subseries bar',
    async (query) => {
      const page = await browser.newPage()
      page.setDefaultTimeout(PAGE_LOAD_TIMEOUT_MS)
      const consoleErrors: string[] = []
      page.on('console', (message) => {
        if (message.type() !== 'error') return
        // Matomo rate-limits beacons (429), which says nothing about the search.
        if (new URL(message.location().url || BASE_URL).hostname === ANALYTICS_HOST) return
        consoleErrors.push(message.text())
      })

      await page.goto(new URL(`/search/?q=${encodeURIComponent(query)}`, BASE_URL).href)
      await page.locator('[data-subseries-bar]').waitFor()

      expect(consoleErrors).toEqual([])
      await page.close()
    },
    PAGE_LOAD_TIMEOUT_MS * 2
  )
})
