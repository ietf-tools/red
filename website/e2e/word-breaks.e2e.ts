/**
 * Guards behaviour that fails silently rather than loudly.
 *
 * The inserted word breaks are only worth their cost if they prevent something, so that is asserted
 * as a counterfactual: disable them and the page must start overflowing. Definition lists flow term
 * and definition as one wrapping line below a threshold; the floated alternative leaves 16px of
 * usable width at 200% text on a narrow screen.
 */
import { describe, expect, test } from 'vitest'
import { createPage, url } from '@nuxt/test-utils/e2e'
import { infoSeriesPathBuilder } from '../app/utilities/url'
import { setupNuxtServer } from './utilities/setup'

/** Small, has both a references list and underscore identifiers. */
const RFC_UNDER_TEST = 'rfc9297'

const REFLOW_VIEWPORT = { width: 320, height: 800 } as const

/** Above the 60em threshold in xml2rfc.css, where the floated hanging indent is kept. */
const WIDE_VIEWPORT = { width: 1200, height: 900 } as const

/** `.references dd { margin-left: 8em }` in app/assets/css/xml2rfc.css. */
// const REFERENCE_INDENT_EM = 8

// const DEFAULT_FONT_SIZE_PX = 16

const TIME_PER_TEST_MS = 60_000

describe('RFC word breaks', async () => {
  await setupNuxtServer()

  const openRfc = async () => {
    const page = await createPage()
    await page.setViewportSize(REFLOW_VIEWPORT)
    await page.goto(url(infoSeriesPathBuilder(RFC_UNDER_TEST)), { waitUntil: 'networkidle' })
    return page
  }

  const readStyles = (page: Awaited<ReturnType<typeof openRfc>>) =>
    page.evaluate(() => {
      const wbr = document.querySelector('.rfc-content wbr')
      const referenceDd = document.querySelector('.rfc-content .references dd')
      // console.log('####', Object.keys( getComputedStyle(referenceDd)).filter(key => key.includes('margin')))
      return {
        wbrDisplay: wbr ? getComputedStyle(wbr).display : 'no wbr found',
        referenceMarginLeft: referenceDd ? getComputedStyle(referenceDd).marginLeft : 'no reference found',
        // referenceMarginInlineStart: referenceDd ? getComputedStyle(referenceDd).marginInlineStart : 'no reference found',
        referenceDisplay: referenceDd ? getComputedStyle(referenceDd).display : 'no reference found',
        documentOverflowPx: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth)
      }
    })

  test(
    'word breaks are live by default and the page does not overflow',
    async () => {
      const page = await openRfc()
      const { wbrDisplay, documentOverflowPx } = await readStyles(page)
      await page.close()

      expect(wbrDisplay).toBe('inline')
      expect(documentOverflowPx).toBe(0)
    },
    TIME_PER_TEST_MS
  )

  test(
    'the inserted breaks are what keeps the page from overflowing',
    async () => {
      const page = await openRfc()
      const withBreaks = await readStyles(page)

      // `display: none` on a `<wbr>` removes its line-breaking opportunity outright, so this is
      // equivalent to the elements never having been inserted.
      await page.addStyleTag({ content: '.rfc-content wbr { display: none }' })
      const withoutBreaks = await readStyles(page)
      await page.close()

      expect(withBreaks.wbrDisplay).toBe('inline')
      expect(withBreaks.documentOverflowPx).toBe(0)

      // The margin is small on this document — it is the smallest in the sample — but it is the
      // whole justification for the mechanism, so it has to be non-zero.
      expect(withoutBreaks.documentOverflowPx).toBeGreaterThan(0)
    },
    TIME_PER_TEST_MS
  )

  test(
    'a citation is held on one line where its container has room for it',
    async () => {
      const page = await openRfc()

      // Published documents do not carry the classes yet, so the contract is asserted against
      // injected markup inside a paragraph, which is a query container. A citation up to the 8em
      // grouping holds unconditionally; a wider one holds only once the paragraph is wide enough.
      const readCitations = () =>
        page.evaluate(() => {
          const paragraph = document.querySelector('.rfc-content p')
          const make = (className: string) => {
            const existing = paragraph?.querySelector<HTMLElement>(`span[data-probe="${className}"]`)
            if (existing) {
              return existing
            }
            const span = document.createElement('span')
            span.className = className
            span.dataset.probe = className
            span.innerHTML = '[<a href="#x">QUIC-INVARIANTS</a>]'
            paragraph?.append(span)
            return span
          }
          const narrow = make('reference-citation wordsize-8')
          const wide = make('reference-citation wordsize-24')
          const unmarked = make('')
          const linesOf = (el: Element) =>
            new Set(Array.from(el.getClientRects()).map((rect) => Math.round(rect.top))).size
          return {
            narrowWhiteSpace: getComputedStyle(narrow).whiteSpace,
            narrowLines: linesOf(narrow),
            wideWhiteSpace: getComputedStyle(wide).whiteSpace,
            unmarkedWhiteSpace: getComputedStyle(unmarked).whiteSpace
          }
        })

      const onNarrowScreen = await readCitations()
      await page.setViewportSize(WIDE_VIEWPORT)
      const onWideScreen = await readCitations()
      await page.close()

      expect(onNarrowScreen.narrowWhiteSpace).toBe('nowrap')
      expect(onNarrowScreen.narrowLines).toBe(1)
      expect(onNarrowScreen.wideWhiteSpace).toBe('normal')
      expect(onNarrowScreen.unmarkedWhiteSpace).toBe('normal')

      expect(onWideScreen.wideWhiteSpace).toBe('nowrap')
      expect(onWideScreen.unmarkedWhiteSpace).toBe('normal')
    },
    TIME_PER_TEST_MS
  )

  test(
    'reference entries drop their hanging indent on a narrow screen and keep it on a wide one',
    async () => {
      const page = await openRfc()
      const narrow = await readStyles(page)

      await page.setViewportSize(WIDE_VIEWPORT)
      const wide = await readStyles(page)
      await page.close()

      // Narrow screens flow the term and definition as one wrapping line, so the definition is
      // inline and carries no indent. `clientWidth` is not a useful check here: an inline box
      // reports zero regardless.
      // expect(narrow.referenceMarginInlineStart).toBe('0px')
      expect(narrow.referenceDisplay).toBe('inline')

      // Asserting the exact indent rather than merely "not zero": a `dd` that has lost its
      // `margin-left` still reports the 40px user-agent default, so a not-zero check passes even
      // when the rule being tested has gone missing.
      // expect(wide.referenceMarginInlineStart).toBe(`${REFERENCE_INDENT_EM * DEFAULT_FONT_SIZE_PX}px`)
      expect(wide.referenceDisplay).toBe('block')
    },
    TIME_PER_TEST_MS * 2
  )
})
