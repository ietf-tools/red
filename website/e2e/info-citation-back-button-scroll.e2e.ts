/**
 * Regression test for the browser Back button after following an in-content
 * citation link (e.g. clicking `[FIPS-203]` or `[RFC9580]` in the running text of
 * an RFC info page).
 *
 * See https://github.com/ietf-tools/red/issues/441 and
 * https://github.com/ietf-tools/red/issues/440
 *
 * THE BUG
 * -------
 * Citations are plain `<a href="#…">` anchors, not router links. Clicking one scrolls
 * to the referenced entry natively. Back should return the reader to where they
 * clicked, but two things stood in the way:
 *
 * 1. Nuxt/vue-router runs `scrollBehavior` on every popstate and its default forces
 *    `{ top: 0 }` when a hash is removed, throwing the reader to the top of the page.
 * 2. Once the router has navigated (i.e. the page was reached by following a link on
 *    the site rather than a hard load) it turns the browser's own scroll restoration
 *    off, and it never recorded a position for the native hash jump, so nothing
 *    restored the reader at all. A hard load hides this, because the browser is still
 *    restoring scroll itself, so both arrivals are covered here.
 */
import { describe, expect, test } from 'vitest'
import { infoSeriesPathBuilder } from '../app/utilities/url'
import { REEF_STATS_MASK_CSS } from './utilities/reef-stats-mask'
import { expectScreenshotToMatchBaseline } from './utilities/screenshot'
import { openHydratedPage, setupNuxtServer } from './utilities/setup'

// rfc9980 is available via the `/api/v1/**` dev proxy and has in-text NON-RFC citations
// ([FIPS-203], [NISTIR-8413]) and RFC citations ([RFC9580]) rendered as native anchors.
const RFC = 'rfc9980'

const VIEWPORT = { width: 1280, height: 900 }

// After Back, the scroll position should match the pre-click position closely.
// A failure (stuck at the reference, or jumped to top) is thousands of px away, so this
// tolerance is generous.
const RESTORE_TOLERANCE_PX = 80

const SETTLE_MS = 800

const TEST_TIMEOUT_MS = 120_000

const CITATION_SELECTORS = {
  'non-RFC': '.rfc-content a[data-non-rfc-anchor-link][href^="#"]',
  RFC: '.rfc-content a[data-is-hash-link][href^="#RFC"]'
}

type Arrival = 'hard load' | 'client-side navigation'

describe('info/rfcN citation Back button', async () => {
  await setupNuxtServer()

  const openRfcPage = async (arrival: Arrival) => {
    if (arrival === 'hard load') {
      return openHydratedPage(infoSeriesPathBuilder(RFC))
    }
    const page = await openHydratedPage('/')
    await page.evaluate((path) => window.useNuxtApp?.().$router.push(path), infoSeriesPathBuilder(RFC))
    return page
  }

  const arrivals: Arrival[] = ['hard load', 'client-side navigation']

  describe.each(arrivals)('arriving by %s', (arrival) => {
    test.each(Object.entries(CITATION_SELECTORS))(
      'pressing Back after following a %s citation restores the reading position',
      async (_kind, citationSelector) => {
        const page = await openRfcPage(arrival)
        await page.setViewportSize(VIEWPORT)

        await page.locator('.rfc-content').first().waitFor({ state: 'visible' })

        if (arrival === 'hard load' && citationSelector === CITATION_SELECTORS['non-RFC']) {
          // Captured before any interaction: the post-load state is the one that stays
          // stable as the scroll assertions below evolve.
          await expectScreenshotToMatchBaseline(page, RFC, { maskCss: REEF_STATS_MASK_CSS })
        }

        // Choose a citation that sits well down the page AND whose reference target is
        // further down still, so that following it is a large downward scroll and a bug
        // is unambiguously distinct from a correct restore.
        const href = await page.evaluate((selector) => {
          for (const anchor of document.querySelectorAll<HTMLAnchorElement>(selector)) {
            const linkTop = anchor.getBoundingClientRect().top + window.scrollY
            const target = document.getElementById((anchor.getAttribute('href') ?? '').slice(1))
            if (!target) {
              continue
            }
            const targetTop = target.getBoundingClientRect().top + window.scrollY
            if (linkTop > 1000 && targetTop > linkTop + 1000) {
              return anchor.getAttribute('href')
            }
          }
          return undefined
        }, citationSelector)
        expect(href, 'expected a citation well above its reference target').toBeTruthy()

        const link = page.locator(`${citationSelector.replace('[href^="#"]', '')}[href="${href}"]`).first()
        await link.waitFor({ state: 'visible' })

        // Position the citation like a reader would, then record the scroll position.
        await link.evaluate((element) => {
          const top = element.getBoundingClientRect().top + window.scrollY
          window.scrollTo({ top: Math.max(0, top - 300), behavior: 'instant' })
        })
        await page.waitForTimeout(SETTLE_MS)
        const beforeY = await page.evaluate(() => Math.round(window.scrollY))
        expect(beforeY, 'citation should be scrolled well down the page').toBeGreaterThan(RESTORE_TOLERANCE_PX)

        // Follow the citation — it jumps down to the References entry.
        await link.click()
        await page.waitForTimeout(SETTLE_MS)
        const afterClickY = await page.evaluate(() => Math.round(window.scrollY))
        expect(afterClickY, 'clicking the citation should scroll to the reference').toBeGreaterThan(
          beforeY + RESTORE_TOLERANCE_PX
        )

        // Press Back — the reader should return to where they clicked.
        await page.goBack()
        await page.waitForTimeout(SETTLE_MS)
        const afterBackY = await page.evaluate(() => Math.round(window.scrollY))

        await page.close()

        expect(
          Math.abs(afterBackY - beforeY),
          `Back should restore scroll to ~${beforeY}px but landed at ${afterBackY}px`
        ).toBeLessThanOrEqual(RESTORE_TOLERANCE_PX)
      },
      TEST_TIMEOUT_MS
    )
  })
})
