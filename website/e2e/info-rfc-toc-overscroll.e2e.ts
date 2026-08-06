/**
 * Regression test for ToC overscroll chaining on RFC info pages.
 * https://github.com/ietf-tools/red/issues/456
 *
 * THE BUG
 * -------
 * The desktop Table of Contents (TableOfContentsHighlight -> VerticalScrollable)
 * is an `overflow-y-auto` scroll container. Without `overscroll-behavior`, the
 * browser default (`auto`) lets a wheel gesture that reaches the ToC's scroll
 * boundary *chain* into the page scroll. Compounding it, `useScrollTocContainer`
 * (app/utilities/scroll.ts) re-centres the ToC on the active heading whenever the
 * page scrolls — so as soon as overscroll nudges the page, the ToC jumps back to
 * the active heading and the reader can never reach the first section.
 *
 * THE FIX (app/components/TableOfContentsHighlight.vue)
 * ----------------------------------------------------
 * `overscroll-contain` (CSS `overscroll-behavior: contain`) on the ToC scroll
 * container stops the wheel gesture from chaining to the page once the ToC hits a
 * boundary, which in turn stops the auto re-centring cascade.
 *
 * THE TEST
 * --------
 * A short viewport forces the ToC to overflow (so it is a real scroll container).
 * With the ToC pinned to its top boundary and the page scrolled partway down,
 * wheeling *up* over the ToC must NOT move the page. On the unfixed code the page
 * scrolls all the way to the top (verified: 600px -> 0 on prod); with the fix it
 * stays put (0px of movement).
 */
import { describe, expect, test } from 'vitest'
import { createPage } from '@nuxt/test-utils/e2e'
import type { Page } from 'playwright-core'
import { infoSeriesPathBuilder } from '../app/utilities/url'
import { expectScreenshotToMatchBaseline } from './utilities/screenshot'
import { setupNuxtServer } from './utilities/setup'

// rfc10008 (the RFC named in the issue) is available via the `/api/v1/**` dev proxy
// and has a ToC long enough to overflow the short viewport used below.
const RFC = 'rfc10008'

// A short viewport guarantees the ToC content overflows its container, so it is an
// actual scroll container with top/bottom boundaries (overscroll-behavior is a
// no-op on a non-scrollable element).
const VIEWPORT = { width: 1280, height: 700 }

// How far to scroll the page down before wheeling up over the ToC. This is the
// distance the page would chain-scroll (back to the top) on the unfixed code, so
// it must be comfortably larger than PAGE_MOVE_TOLERANCE_PX.
const PAGE_SCROLL_Y = 600

// The page must not move more than this (px) when the ToC absorbs the wheel.
const PAGE_MOVE_TOLERANCE_PX = 20

const TEST_TIMEOUT_MS = 120_000

/**
 * Finds the ToC scroll container (nearest scrollable ancestor of the ToC nav),
 * tags it with `data-toc-scroll`, and returns its centre point plus computed
 * overscroll-behaviour. Returns null if no scrollable container is found.
 */
const locateTocScrollContainer = (page: Page) =>
  page.evaluate(() => {
    const nav = document.querySelector('nav[aria-label="In this section"]')
    if (!nav) return null
    let element = nav.parentElement
    while (element) {
      const style = getComputedStyle(element)
      const isScrollable =
        (style.overflowY === 'auto' || style.overflowY === 'scroll') && element.scrollHeight > element.clientHeight + 1
      if (isScrollable) {
        element.setAttribute('data-toc-scroll', '1')
        const rect = element.getBoundingClientRect()
        return {
          overscrollBehaviorY: style.overscrollBehaviorY,
          centre: { x: Math.round(rect.x + rect.width / 2), y: Math.round(rect.y + rect.height / 2) }
        }
      }
      element = element.parentElement
    }
    return null
  })

describe('info/rfcN/ ToC overscroll', async () => {
  await setupNuxtServer()

  test(
    'wheeling up over the ToC at its top boundary does not chain-scroll the page',
    async () => {
      const page = await createPage(infoSeriesPathBuilder(RFC))
      await page.setViewportSize(VIEWPORT)

      await page.locator('nav[aria-label="In this section"]').first().waitFor({ state: 'visible' })

      // Captured before any interaction: the post-load state is the one that stays
      // stable as the scroll assertions below evolve.
      await expectScreenshotToMatchBaseline(page, RFC)

      const container = await locateTocScrollContainer(page)
      expect(container, 'expected a scrollable ToC container (viewport too tall?)').not.toBeNull()

      // Guard the CSS itself: the fix is `overscroll-behavior: contain` on this container.
      expect(container!.overscrollBehaviorY).toBe('contain')

      // Pin the ToC to its top boundary and scroll the page partway down so there is
      // room for an upward wheel to chain the page back to the top.
      await page.evaluate((scrollY) => {
        const element = document.querySelector('[data-toc-scroll]')
        if (element instanceof HTMLElement) element.scrollTop = 0
        window.scrollTo(0, scrollY)
      }, PAGE_SCROLL_Y)
      await page.waitForTimeout(300)

      const pageYBefore = await page.evaluate(() => Math.round(window.scrollY))
      expect(pageYBefore, 'page did not scroll down as set up').toBeGreaterThan(PAGE_SCROLL_Y - PAGE_MOVE_TOLERANCE_PX)

      // Wheel up over the ToC while it sits at its top boundary.
      await page.mouse.move(container!.centre.x, container!.centre.y)
      for (let i = 0; i < 6; i++) {
        await page.mouse.wheel(0, -240)
        await page.waitForTimeout(60)
      }
      await page.waitForTimeout(400)

      const pageYAfter = await page.evaluate(() => Math.round(window.scrollY))
      const pageMoved = Math.abs(pageYAfter - pageYBefore)

      await page.close()

      expect(
        pageMoved,
        `wheeling up over the ToC chained into the page scroll (moved ${pageMoved}px from ${pageYBefore} to ${pageYAfter}); expected the ToC to contain the overscroll`
      ).toBeLessThanOrEqual(PAGE_MOVE_TOLERANCE_PX)
    },
    TEST_TIMEOUT_MS
  )
})
