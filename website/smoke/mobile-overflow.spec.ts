// No horizontal window scroll ("broken mobile layout") on RFC info pages at 320px.
//
// The RFCs below are the regression set from the earlier scrolling investigation: the pages that
// actually broke, plus a spread chosen to maximise structural variety (content type, tables,
// nested definition lists, SVG diagrams, ABNF, source code, figures). 320px is the smallest
// common device width (iPhone SE) and in practice the only width these failures reproduce at —
// at 390px+ almost everything fits.
//
// Note some of these overflows are fixed in `precomputer/` (word-break <wbr> insertion) rather
// than in this app, so they only clear once the target environment's RFC HTML has been
// re-precomputed. As of writing, rfc9880 and rfc9553 pass on production but rfc9618 still
// overflows by ~24px: its remaining culprit is the `constrained_` chunk inside
// `authority_constrained_policy_set`, which has no further semantic break opportunity and is short
// enough that the <wbr> algorithm deliberately won't split it. Mute known cases with
// SMOKE_ALLOW_OVERFLOW=rfc9618 rather than editing this list, so the muting is visible in the run
// that used it.

import { expect, MOBILE_VIEWPORT, measureHorizontalOverflow, test } from './fixtures'
import { infoPath } from './fixtures'
import { getAllowedOverflowRfcs } from './targets'

type OverflowCase = {
  rfc: string
  /** Why this RFC is in the set — the layout features it exercises. */
  features: string
}

const CASES: OverflowCase[] = [
  { rfc: 'rfc10015', features: 'the original 644px break: flex min-width:auto + nowrap section headings' },
  { rfc: 'rfc9618', features: 'deep dl nesting, 8 SVG diagrams, blockquotes, figures' },
  { rfc: 'rfc9880', features: 'JSON-schema appendix: 13 tables, 30 code blocks' },
  { rfc: 'rfc9553', features: 'very large: 22 tables, 107 dl, ABNF, 44 sourcecode' },
  { rfc: 'rfc9605', features: 'extreme: 307 code blocks / 326 horizontal-scroll containers' },
  { rfc: 'rfc9635', features: '124 code blocks, 76 dl, 16 tables' },
  { rfc: 'rfc9834', features: '66 figures, 19 SVG, 50 code blocks' },
  { rfc: 'rfc9594', features: '60 ul, 16 SVG, 38 figures, list depth 3' },
  { rfc: 'rfc9535', features: '19 ABNF blocks, list depth 4' },
  { rfc: 'rfc708', features: 'plaintext content type — a different render path' },
  { rfc: 'rfc9538', features: 'small and simple: 1 table, 1 SVG, 1 figure (control case)' }
]

const allowedOverflow = getAllowedOverflowRfcs()

// A locked viewport, never device emulation: with `isMobile: true` Chromium shrink-to-fits, so
// window.innerWidth expands to the content width and an overflowing page reports no overflow.
test.use({ viewport: MOBILE_VIEWPORT })

test.describe(`no horizontal overflow at ${MOBILE_VIEWPORT.width}px`, () => {
  for (const { rfc, features } of CASES) {
    test(`${rfc} — ${features}`, async ({ page }) => {
      test.skip(allowedOverflow.includes(rfc), `muted via SMOKE_ALLOW_OVERFLOW`)
      // These are some of the largest documents on the site and they render at a width that
      // maximises reflow work.
      test.slow()

      await page.goto(infoPath(rfc), { waitUntil: 'networkidle' })
      await expect(page.locator('.rfc-content')).toBeVisible()

      const overflow = await measureHorizontalOverflow(page)
      expect(overflow, `${rfc} overflows ${MOBILE_VIEWPORT.width}px by ${overflow}px`).toBeLessThanOrEqual(0)
    })
  }
})
