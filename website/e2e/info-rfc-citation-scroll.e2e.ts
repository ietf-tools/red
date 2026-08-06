/**
 * Regression test for the "scroll bounce" when following an in-content RFC citation
 * link (e.g. clicking `[RFC2119]` in the running text of an RFC info page).
 *
 * THE BUG
 * -------
 * In-text RFC citations render as `RFCRouterLink`, which wraps the `<a href="#…">`
 * in a Reka Popover (the Wikipedia-style hover/focus preview card). Non-RFC links
 * (FIPS, DOI, …) render as a plain `Anchor` and are unaffected.
 *
 * When the preview popover closes, Reka's default `onCloseAutoFocus` calls
 * `.focus()` on the trigger link. After the reader has followed the link and the
 * page has scrolled down to the referenced entry, that trigger link is off-screen,
 * so the browser natively scrolls it *back* into view — yanking the reader back to
 * roughly where they clicked. This is a native focus-scroll, so it is invisible to
 * any `scrollTo` interception and is unaffected by `history.scrollRestoration` or
 * `overflow-anchor`.
 *
 * THE TIMING (why this test is deterministic)
 * -------------------------------------------
 * Focusing (or hovering) the link arms a `DELAY_POPOVER_MS = 1000` timer that opens
 * the preview once its data has loaded. If the link is CLICKED before that timer
 * fires (i.e. < 1000ms after focus), the popover's open — and its subsequent
 * close-time `.focus()` — happen AFTER the navigation scroll, producing the bounce.
 * Clicking >= 1000ms after focus (popover already open) does not bounce.
 *
 * So focusing then clicking after a sub-1000ms delay reproduces the bounce ~100% of
 * the time (verified: 100/100 on the unfixed code, 0/100 with the fix).
 *
 * THE FIX (app/components/RFCRouterLink.vue)
 * -----------------------------------------
 * `onCloseAutoFocus` cancels Reka's focus restoration when focus is already outside
 * the card (e.g. on the just-clicked trigger link) — there is nothing to restore,
 * so nothing scrolls. When focus is inside the card (keyboard Escape) the
 * WCAG-friendly focus-return is preserved. `onClick` also dismisses the preview and
 * clears the pending open timer so it cannot open after the click.
 *
 * This test asserts the user-facing behaviour: after clicking a citation the page
 * stays at the referenced target and does not bounce back.
 */
import { describe, expect, test } from 'vitest'
import { createPage } from '@nuxt/test-utils/e2e'
import type { Page } from 'playwright-core'
import { infoSeriesPathBuilder } from '../app/utilities/url'
import { expectScreenshotToMatchBaseline } from './utilities/screenshot'
import { setupNuxtServer } from './utilities/setup'

// rfc8900 is available via the `/api/v1/**` dev proxy and has several in-text RFC
// citations (RFC2119, RFC8174, RFC0791, …) whose preview data also loads.
const RFC = 'rfc8900'

// A short viewport keeps the citations (near the top) far from the References
// section they link to, so a bounce is an unambiguous large scroll.
const VIEWPORT = { width: 1280, height: 720 }

// Click this long after focusing the link. Must be < DELAY_POPOVER_MS (1000) to hit
// the deferred-open window that produces the bounce (see header).
const FOCUS_TO_CLICK_MS = 500

// How long to wait after the click for the deferred popover open + close-focus to
// run. Comfortably longer than DELAY_POPOVER_MS + CLOSE_LAG_MS.
const SETTLE_AFTER_CLICK_MS = 1800

// A bounce returns near the pre-click position, i.e. hundreds of px from the target.
const BOUNCE_TOLERANCE_PX = 400

const ATTEMPTS = 10

const TEST_TIMEOUT_MS = 120_000

/** Absolute document offset (px) of the element the citation links to. */
const targetOffsetOf = (page: Page, id: string): Promise<number> =>
  page.evaluate((elementId) => {
    const element = document.getElementById(elementId)
    if (!element) {
      throw new Error(`target #${elementId} not found`)
    }
    return Math.round(element.getBoundingClientRect().top + window.scrollY)
  }, id)

describe('info/rfcN citation links', async () => {
  await setupNuxtServer()

  test(
    'clicking an in-content RFC citation stays at the target and does not scroll back',
    async () => {
      const page = await createPage(infoSeriesPathBuilder(RFC))
      await page.setViewportSize(VIEWPORT)

      // Behave like a real first visit: preview data is fetched fresh, so the popover
      // open (and its close-focus) land around the interaction rather than instantly.
      const cdp = await page.context().newCDPSession(page)
      await cdp.send('Network.setCacheDisabled', { cacheDisabled: true })

      await page.locator('.rfc-content').first().waitFor({ state: 'visible' })

      // Captured before any interaction: the post-load state is the one that stays
      // stable as the scroll assertions below evolve.
      await expectScreenshotToMatchBaseline(page, RFC)

      // Distinct in-text RFC citation links (rendered as RFCRouterLink previews).
      const ids = await page.evaluate(() => [
        ...new Set(
          Array.from(document.querySelectorAll('.rfc-content a[href^="#RFC"]')).map((anchor) =>
            (anchor.getAttribute('href') ?? '').slice(1)
          )
        )
      ])
      expect(ids.length, 'expected in-content RFC citation links on the page').toBeGreaterThan(0)

      const failures: string[] = []

      for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
        const id = ids[attempt % ids.length]
        const link = page.locator(`.rfc-content a[href="#${id}"]`).first()

        await link.scrollIntoViewIfNeeded()
        const target = await targetOffsetOf(page, id)

        // Focus arms the preview-open timer + data fetch; clicking before it opens is
        // what triggers the bounce.
        await link.focus()
        await page.waitForTimeout(FOCUS_TO_CLICK_MS)
        await link.click()
        await page.waitForTimeout(SETTLE_AFTER_CLICK_MS)

        const finalY = await page.evaluate(() => window.scrollY)
        const drift = Math.abs(finalY - target)
        if (drift > BOUNCE_TOLERANCE_PX) {
          failures.push(`#${id}: scrolled to target ${target}px then bounced back to ${finalY}px (drift ${drift}px)`)
        }

        // Reset focus/pointer for the next attempt.
        await page.evaluate(() => {
          const active = document.activeElement
          if (active instanceof HTMLElement) {
            active.blur()
          }
        })
        await page.mouse.move(5, 5)
        await page.waitForTimeout(100)
      }

      await page.close()

      expect(failures, `citation click bounced back instead of staying at target:\n${failures.join('\n')}`).toEqual([])
    },
    TEST_TIMEOUT_MS
  )
})
