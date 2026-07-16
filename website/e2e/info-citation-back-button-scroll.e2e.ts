/**
 * Regression test for the browser Back button after following an in-content
 * NON-RFC citation link (e.g. clicking `[FIPS-203]` in the running text of an
 * RFC info page).
 *
 * See https://github.com/ietf-tools/red/issues/441
 *
 * THE BUG (native browser behaviour broken by Nuxt/vue-router)
 * ------------------------------------------------------------
 * Non-RFC citations (FIPS, DOI, …) render as a plain `Anchor` — a native
 * `<a href="#…">`, not a router link. Clicking one scrolls to the referenced
 * entry natively and the browser records the scroll position for that history
 * entry, exactly as the web platform specifies. Back should therefore return the
 * reader to where they clicked.
 *
 * Nuxt/vue-router breaks this. Its global popstate handler runs `scrollBehavior`
 * on every Back, including one triggered by a native anchor the router never
 * created (`history.state.scroll` is `null`). With no position of its own to
 * restore, its default overrides the browser's native scroll restoration and
 * forces `{ top: 0 }`, throwing the reader to the top of the page. It is a
 * regression of native browser behaviour caused by the router — the app clicks a
 * standard hash anchor and the router breaks it.
 *
 * THE FIX (app/router.options.ts)
 * -------------------------------
 * A `scrollBehavior` that hands scroll restoration back to the browser (returns
 * `false`) for same-page hash navigation — where the content is already rendered
 * and native restoration is correct — instead of letting the router force the
 * page to the top. This restores the native behaviour: pressing Back returns the
 * reader to their original position.
 *
 * This test asserts the user-facing behaviour: after clicking a non-RFC citation
 * and pressing Back, the page returns to the pre-click scroll position.
 */
import { describe, expect, test } from 'vitest'
import { createPage, setup } from '@nuxt/test-utils/e2e'
import { infoSeriesPathBuilder } from '../app/utilities/url'

// rfc9980 is available via the `/api/v1/**` dev proxy and has several in-text
// NON-RFC citations ([FIPS-203], [FIPS-204], [FIPS-205]) rendered as plain
// native anchors.
const RFC = 'rfc9980'

const VIEWPORT = { width: 1280, height: 900 }

// After Back, the scroll position should match the pre-click position closely.
// A failure (jump to top) is thousands of px away, so this tolerance is generous.
const RESTORE_TOLERANCE_PX = 80

const SETTLE_MS = 800

const TEST_TIMEOUT_MS = 120_000

describe('info/rfcN non-RFC citation Back button', async () => {
  // `dev: true` runs the Nuxt dev server so the `/api/v1/**` proxy in nuxt.config.ts
  // applies (the page content needs it).
  await setup({ browser: true, dev: true })

  test(
    'pressing Back after following a non-RFC citation restores the reading position',
    async () => {
      const page = await createPage(infoSeriesPathBuilder(RFC))
      await page.setViewportSize(VIEWPORT)

      await page.locator('.rfc-content').first().waitFor({ state: 'visible' })

      // In-text non-RFC citation links render as plain native anchors tagged with
      // `data-non-rfc-anchor-link` and pointing at an in-document hash. Choose one
      // that sits well down the page AND whose reference target is further down
      // still, so that following it is a large downward scroll and a bug (jump to
      // top) is unambiguously distinct from a correct restore.
      const href = await page.evaluate(() => {
        const anchors = Array.from(
          document.querySelectorAll<HTMLAnchorElement>('.rfc-content a[data-non-rfc-anchor-link][href^="#"]')
        )
        for (const anchor of anchors) {
          const linkTop = anchor.getBoundingClientRect().top + window.scrollY
          const targetId = (anchor.getAttribute('href') ?? '').slice(1)
          const target = document.getElementById(targetId)
          if (!target) {
            continue
          }
          const targetTop = target.getBoundingClientRect().top + window.scrollY
          if (linkTop > 1000 && targetTop > linkTop + 1000) {
            return anchor.getAttribute('href')
          }
        }
        return undefined
      })
      expect(href, 'expected a non-RFC citation well above its reference target').toBeTruthy()

      const link = page.locator(`.rfc-content a[data-non-rfc-anchor-link][href="${href}"]`).first()
      await link.waitFor({ state: 'visible' })

      // Position the citation mid-viewport like a reader would, then record the
      // scroll position.
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
