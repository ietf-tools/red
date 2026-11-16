/**
 * Regression test for following a link to a section of a different RFC
 * (e.g. "Section 4 of [RFC8259]" in RFC 9224).
 *
 * THE BUG
 * -------
 * The link is a client-side navigation. The router changes the URL first and the previous RFC
 * stays on screen until the new one's data has loaded. The hash was being scrolled to straight
 * away, so it resolved against the OLD page, which has a `#section-4` of its own, and the reader
 * was left there when the new RFC replaced it.
 */
import { describe, expect, test } from 'vitest'
import { infoSeriesPathBuilder } from '../app/utilities/url'
import { openHydratedPage, setupNuxtServer } from './utilities/setup'

const FROM_RFC = 'rfc9224'
const TO_RFC = 'rfc8259'
const TO_HASH = '#section-4'

const VIEWPORT = { width: 1280, height: 900 }

// A wrong landing is thousands of px away, so this tolerance is generous.
const LANDING_TOLERANCE_PX = 150

const SETTLE_MS = 3000

const TEST_TIMEOUT_MS = 120_000

describe('info/rfcN links to a section of another RFC', async () => {
  await setupNuxtServer()

  test(
    'scrolls to the section of the new RFC rather than a position in the old page',
    async () => {
      const page = await openHydratedPage(infoSeriesPathBuilder(FROM_RFC))
      await page.setViewportSize(VIEWPORT)
      await page.locator('.rfc-content').first().waitFor({ state: 'visible' })

      const link = page.locator(`.rfc-content a[href="${infoSeriesPathBuilder(TO_RFC)}${TO_HASH}"]`).first()
      await link.scrollIntoViewIfNeeded()
      await link.click()

      await page.waitForURL(`**${infoSeriesPathBuilder(TO_RFC)}${TO_HASH}`)
      await page.waitForTimeout(SETTLE_MS)

      const { heading, top } = await page.evaluate((hash) => {
        const target = document.getElementById(hash.slice(1))
        return {
          heading: document.querySelector('h1')?.textContent?.trim() ?? '',
          top: target ? Math.round(target.getBoundingClientRect().top) : undefined
        }
      }, TO_HASH)

      await page.close()

      // The title separates "RFC" from its number with a non-breaking space.
      expect(heading.replace(/\s/g, ' '), 'the new RFC should be showing').toContain(TO_RFC.replace('rfc', 'RFC '))
      expect(top, `${TO_HASH} should exist in the new RFC`).toBeDefined()
      expect(
        Math.abs(top ?? Number.POSITIVE_INFINITY),
        `${TO_HASH} should be at the top of the window but is ${top}px from it`
      ).toBeLessThanOrEqual(LANDING_TOLERANCE_PX)
    },
    TEST_TIMEOUT_MS
  )

  test(
    'pressing Back returns to the reading position in the first RFC',
    async () => {
      const page = await openHydratedPage(infoSeriesPathBuilder(FROM_RFC))
      await page.setViewportSize(VIEWPORT)
      await page.locator('.rfc-content').first().waitFor({ state: 'visible' })

      const link = page.locator(`.rfc-content a[href="${infoSeriesPathBuilder(TO_RFC)}${TO_HASH}"]`).first()
      await link.scrollIntoViewIfNeeded()
      const beforeY = await page.evaluate(() => Math.round(window.scrollY))
      await link.click()
      await page.waitForURL(`**${infoSeriesPathBuilder(TO_RFC)}${TO_HASH}`)
      await page.waitForTimeout(SETTLE_MS)

      await page.goBack()
      await page.waitForTimeout(SETTLE_MS)
      const { heading, afterBackY } = await page.evaluate(() => ({
        heading: document.querySelector('h1')?.textContent?.trim() ?? '',
        afterBackY: Math.round(window.scrollY)
      }))

      await page.close()

      expect(heading.replace(/\s/g, ' '), 'Back should show the first RFC again').toContain(
        FROM_RFC.replace('rfc', 'RFC ')
      )
      expect(
        Math.abs(afterBackY - beforeY),
        `Back should restore scroll to ~${beforeY}px but landed at ${afterBackY}px`
      ).toBeLessThanOrEqual(LANDING_TOLERANCE_PX)
    },
    TEST_TIMEOUT_MS
  )
})
