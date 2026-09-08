/**
 * Guards the committed advance-width table against the fonts actually rendering.
 *
 * The table is a snapshot, so a change to the font stack invalidates it silently: the failure mode
 * is citations kept whole that no longer fit. Measuring a sample in a browser is the only way to
 * notice.
 */
import { describe, expect, test } from 'vitest'
import { createPage, url } from '@nuxt/test-utils/e2e'
import { infoSeriesPathBuilder } from '../app/utilities/url'
import { fontMetrics, type TextStyle } from '../../precomputer/src/utilities/font-metrics'
import { setupNuxtServer } from './utilities/setup'

/** Has paragraphs, bold reference labels and inline code, so every style is present. */
const RFC_UNDER_TEST = 'rfc9000'

const SELECTORS: Record<TextStyle, string> = {
  body: '.rfc-content p',
  bold: '.rfc-content .references dt',
  monospace: '.rfc-content code'
}

/** A spread of widths: narrow, wide, digits, punctuation and a space. */
const SAMPLE = 'iWM x1[]-.'

const TIME_PER_TEST_MS = 60_000

describe('committed font metrics still match the browser', async () => {
  await setupNuxtServer()

  test(
    'per-character advances agree with a live measurement',
    async () => {
      const page = await createPage()
      await page.goto(url(infoSeriesPathBuilder(RFC_UNDER_TEST)), { waitUntil: 'networkidle' })

      const measured = await page.evaluate(
        ([selectors, sample]) =>
          Object.fromEntries(
            Object.entries(selectors as Record<string, string>).map(([style, selector]) => {
              const element = document.querySelector(selector)
              if (!element) {
                return [style, null]
              }
              const fontSizePx = parseFloat(getComputedStyle(element).fontSize)
              const ruler = document.createElement('span')
              ruler.style.cssText = 'position:absolute;left:-99999px;white-space:pre;visibility:hidden'
              element.append(ruler)
              const advances = Object.fromEntries(
                Array.from(sample as string, (character) => {
                  ruler.textContent = character
                  return [character, ruler.getBoundingClientRect().width / fontSizePx]
                })
              )
              ruler.remove()
              return [style, advances]
            })
          ),
        [SELECTORS, SAMPLE] as const
      )

      await page.close()

      for (const style of Object.keys(SELECTORS) as TextStyle[]) {
        const live = measured[style]
        expect(live, `no element matched ${SELECTORS[style]} — the selector or the markup changed`).toBeTruthy()

        for (const character of SAMPLE) {
          // 2 decimal places (0.005em) absorbs quantisation to 1/10000 em and layout rounding.
          expect(
            live[character],
            `advance for ${JSON.stringify(character)} in ${style} drifted from the committed table; regenerate it`
          ).toBeCloseTo(fontMetrics.styles[style].advanceEm[character], 2)
        }
      }
    },
    TIME_PER_TEST_MS
  )

  test(
    'the table describes the font that is actually rendering',
    async () => {
      const page = await createPage()
      await page.goto(url(infoSeriesPathBuilder(RFC_UNDER_TEST)), { waitUntil: 'networkidle' })
      const live = await page.evaluate((selector) => {
        const element = document.querySelector(selector as string)
        return element ? getComputedStyle(element).fontFamily : null
      }, SELECTORS.body)
      await page.close()

      expect(live).toBe(fontMetrics.styles.body.fontFamily)
    },
    TIME_PER_TEST_MS
  )
})
