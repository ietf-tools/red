/**
 * Regression test for the desktop ToC link scroll being clobbered on RFC info pages.
 *
 * THE BUG
 * -------
 * The desktop menu (`RFCDocumentSidebar.vue`) re-centres itself on screen whenever
 * something inside it is focused or wheeled over, via a debounced
 * `scrollIntoView({ behavior: 'smooth' })`.
 *
 * A mouse click on a ToC link focuses that link on `mousedown`, which arms the
 * debounce. If the timer fires while the button is still held, the smooth scroll back
 * up to the menu is already in flight when `mouseup` performs the anchor navigation —
 * and a running smooth scroll wins, so the page settles at the menu instead of the
 * heading. The reader clicks "4 Goals" and the page inches down ~114px rather than
 * jumping to the section.
 *
 * WHY THE PRESS DURATION IS SWEPT
 * -------------------------------
 * The bug only bites when the debounce fires *between* mousedown and mouseup, so any
 * single press duration only probes one timer value. Verified against production
 * (30ms debounce) and against a 500ms debounce:
 *
 *     press:      50ms   150ms   300ms   600ms   900ms
 *     30ms  →     ok     BUG     ok      BUG     ok
 *     500ms →     ok     ok      ok      BUG     ok
 *
 * Lengthening the debounce only moves the window; it does not close it. Sweeping a
 * spread of realistic press durations is what actually pins the behaviour, and keeps
 * this test honest if the timer is ever retuned.
 *
 * THE FIX (app/components/RFCDocumentSidebar.vue)
 * ----------------------------------------------
 * The focus handler centres only when the focused element matches `:focus-visible`.
 * That is precisely the keyboard/pointer distinction wanted here: a reader tabbing to
 * a ToC link below the fold still gets the menu brought into view, while a reader
 * clicking one is navigating away from the menu and is left alone — so there is no
 * window left for the debounce to fire in, at any press duration.
 *
 * The second test guards that keyboard half, so the bug cannot be "fixed" by deleting
 * the centring outright.
 */
import { describe, expect, test } from 'vitest'
import { createPage } from '@nuxt/test-utils/e2e'
import type { Page } from 'playwright-core'
import { infoSeriesPathBuilder } from '../app/utilities/url'
import { setupNuxtServer } from './utilities/setup'

// rfc8792 is available via the `/api/v1/**` dev proxy and is the document the bug was
// reported against. Its ToC is deep enough that section 4 sits thousands of px down.
const RFC = 'rfc8792'

// Wide enough for the desktop menu to render; the mobile menu has no centring.
const VIEWPORT = { width: 1280, height: 900 }

const DESKTOP_NAV = 'nav[aria-label="In this RFC (desktop menu)"]'

// "4 Goals" — the link named in the bug report.
const TOC_LINK_HREF = '#section-4'

/**
 * How long the mouse button is held down. See "WHY THE PRESS DURATION IS SWEPT" — the
 * spread has to straddle plausible debounce values, not sit on one side of them.
 */
const PRESS_DURATIONS_MS = [50, 150, 300, 600, 900]

/** Longer than any debounce plus the smooth scroll it would start. */
const SETTLE_AFTER_CLICK_MS = 1500

/** Scroll positions are rounded; the anchor landing is otherwise exact. */
const SCROLL_TOLERANCE_PX = 20

/**
 * The clicked heading must sit far enough below the menu that landing on the menu
 * instead of the heading is unambiguous rather than a rounding difference.
 */
const MIN_TARGET_DISTANCE_PX = 500

const TEST_TIMEOUT_MS = 120_000

/** Absolute document offset (px) of the element an in-page link points at. */
const targetOffsetOf = (page: Page, href: string): Promise<number> =>
  page.evaluate((hash) => {
    const element = document.getElementById(decodeURIComponent(hash.slice(1)))
    if (!element) {
      throw new Error(`target ${hash} not found`)
    }
    return Math.round(element.getBoundingClientRect().top + window.scrollY)
  }, href)

/** Absolute document offset (px) of the desktop menu, i.e. where centring would land. */
const navOffsetOf = (page: Page): Promise<number> =>
  page.evaluate((selector) => {
    const element = document.querySelector(selector)
    if (!element) {
      throw new Error(`${selector} not found`)
    }
    return Math.round(element.getBoundingClientRect().top + window.scrollY)
  }, DESKTOP_NAV)

const scrollYOf = (page: Page): Promise<number> => page.evaluate(() => Math.round(window.scrollY))

/** A loaded info page with the desktop menu rendered and settled. */
const openInfoPage = async (): Promise<Page> => {
  const page = await createPage(infoSeriesPathBuilder(RFC))
  await page.setViewportSize(VIEWPORT)
  await page.locator(DESKTOP_NAV).first().waitFor({ state: 'visible' })
  // The menu is only `sticky` once mounted, and centring only runs after mount.
  await page.waitForTimeout(1000)
  return page
}

describe('info/rfcN/ desktop ToC links', async () => {
  await setupNuxtServer()

  test(
    'clicking a ToC link scrolls to that heading however long the button is held',
    async () => {
      const page = await openInfoPage()

      const link = page.locator(`${DESKTOP_NAV} a[href="${TOC_LINK_HREF}"]`).first()
      await expect.poll(() => link.count(), { timeout: 10_000 }).toBeGreaterThan(0)

      const failures: string[] = []

      for (const pressDurationMs of PRESS_DURATIONS_MS) {
        // Start from the top: that is where the menu has not yet stuck to the viewport,
        // so centring it still moves the page and can clobber the anchor scroll.
        await page.evaluate(() => {
          window.scrollTo(0, 0)
        })
        await page.waitForTimeout(500)

        const targetY = await targetOffsetOf(page, TOC_LINK_HREF)
        const navY = await navOffsetOf(page)
        expect(
          targetY - navY,
          'the clicked heading is too close to the menu for this test to distinguish them'
        ).toBeGreaterThan(MIN_TARGET_DISTANCE_PX)

        await link.click({ delay: pressDurationMs })
        await page.waitForTimeout(SETTLE_AFTER_CLICK_MS)

        const finalY = await scrollYOf(page)
        if (Math.abs(finalY - targetY) > SCROLL_TOLERANCE_PX) {
          const landedOnMenu = Math.abs(finalY - navY) <= SCROLL_TOLERANCE_PX
          failures.push(
            `held for ${pressDurationMs}ms: expected the page at the heading (${targetY}px) but it settled at ${finalY}px` +
              (landedOnMenu ? ` — the menu re-centred itself over the anchor scroll` : '')
          )
        }
      }

      await page.close()

      expect(failures, `clicking a ToC link did not scroll to the heading:\n${failures.join('\n')}`).toEqual([])
    },
    TEST_TIMEOUT_MS
  )

  test(
    'keyboard-focusing a ToC link still brings the desktop menu into view',
    async () => {
      const page = await openInfoPage()

      const navY = await navOffsetOf(page)
      expect(navY, 'the menu already starts at the top of the document, so centring is unobservable').toBeGreaterThan(
        SCROLL_TOLERANCE_PX
      )

      // Just above the menu's resting position, so centring has somewhere to move to.
      const startY = Math.floor(navY / 2)
      await page.evaluate((scrollY) => {
        window.scrollTo(0, scrollY)
      }, startY)
      await page.waitForTimeout(500)

      // `preventScroll` removes the browser's own focus-scroll, leaving only the
      // component's centring to account for any movement.
      await page
        .locator(`${DESKTOP_NAV} a[href="${TOC_LINK_HREF}"]`)
        .first()
        .evaluate((element) => {
          element.focus({ preventScroll: true })
        })
      await page.waitForTimeout(SETTLE_AFTER_CLICK_MS)

      const finalY = await scrollYOf(page)

      await page.close()

      expect(
        Math.abs(finalY - navY),
        `keyboard focus should centre the desktop menu at ${navY}px, but the page is at ${finalY}px (started at ${startY}px)`
      ).toBeLessThanOrEqual(SCROLL_TOLERANCE_PX)
    },
    TEST_TIMEOUT_MS
  )
})
