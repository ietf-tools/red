import { describe, expect, test } from 'vitest'
import { infoSeriesPathBuilder } from '../app/utilities/url'
import { openHydratedPage, setupNuxtServer } from './utilities/setup'

describe('info/rfcN preview stacking', async () => {
  await setupNuxtServer()

  test(
    'RFC previews render above heading subseries links',
    async () => {
      const page = await openHydratedPage(infoSeriesPathBuilder('rfc791'))
      await page.setViewportSize({ width: 1280, height: 720 })

      const subseries = page.locator('h1 a[href="/info/std5/"]')
      await subseries.waitFor({ state: 'visible' })

      await page.locator('a[href="/info/rfc2474/"]').first().hover()

      // Reka copies content's z-index onto positioning wrapper here.
      const preview = page
        .locator('[data-reka-popper-content-wrapper]')
        .filter({ has: page.getByRole('dialog') })
      await preview.waitFor({ state: 'visible' })

      const subseriesZIndex = await subseries.evaluate((element) => Number(getComputedStyle(element).zIndex))
      const previewZIndex = await preview.evaluate((element) => {
        const zIndex = getComputedStyle(element).zIndex
        return zIndex === 'auto' ? 0 : Number(zIndex)
      })

      await page.close()

      expect(previewZIndex).toBeGreaterThan(subseriesZIndex)
    },
    120_000
  )
})
