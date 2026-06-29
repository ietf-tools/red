/**
 * Sequentially loads MANY routes /info/rfcN/ at various resolutions
 * to check for rendering glitches such as:
 *  * horizontal scrollbars
 *  * ...
 * (that's it so far. sorry.)
 */
import { Duration } from 'luxon'
import { describe, expect, test } from 'vitest'
import { createPage, NuxtPage, setup, url } from '@nuxt/test-utils/e2e'
import { infoSeriesPathBuilder } from '../app/utilities/url'

// FIXME: decide an appropriate range.
const FIRST_RFC = 1
const LAST_RFC = 10010

const VIEWPORTS = {
  mobile: { width: 300, height: 667 },
  tablet: { width: 1024, height: 768 },
  desktop: { width: 1200, height: 1000 }
} as const

const rfcNumbers = Array.from({ length: LAST_RFC - FIRST_RFC + 1 }, (_, index) => FIRST_RFC + index)

const TIME_PER_TEST_MS = 15_000
const TIME_FOR_CALLIBRATION_TEST_MS = 15_000

// N routes × 3 viewports × page loading and navigation needs a lot of time
const timeForRfcTests = rfcNumbers.length * 3 * TIME_PER_TEST_MS

describe.skip('info/rfcN/ routes', async () => {
  // `dev: true` runs the Nuxt dev server so the `$development` route rules in
  // nuxt.config.ts apply (notably the `/api/v1/**` proxy the app needs to work).
  await setup({ browser: true, dev: true })

  // A horizontal scrollbar appears when the rendered content is wider
  // than the viewport's visible area.
  const testOverflow = async (page: NuxtPage): Promise<number> => {
    return page.evaluate((): number => {
      const { scrollWidth, clientWidth } = document.documentElement
      return scrollWidth - clientWidth
    })
  }

  test(
    'Calibrate overflow tests against intentionally broken page styles',
    async () => {
      const humanTime = Duration.fromObject({ seconds: TIME_FOR_CALLIBRATION_TEST_MS / 1000 })
        .shiftTo('minutes', 'seconds')
        .toHuman()
      console.log('Calibrating for rendering glitches. This can take ', humanTime)
      const page = await createPage()
      const testBadStylesPaths = [`${infoSeriesPathBuilder('rfc0')}?too-wide`]
      for (const testBadStylesPath of testBadStylesPaths) {
        await page.setViewportSize(VIEWPORTS.desktop)
        await page.goto(url(testBadStylesPath), { waitUntil: 'networkidle' })
        const overflow = await testOverflow(page)
        if (overflow > 0) {
          console.log(`[${testBadStylesPath}] Success in calibration. Overflow correctly detected.`)
        } else {
          throw Error(`[${testBadStylesPath}] Failure in calibration. Overflow not correctly detected.`)
        }
      }

      await page.close()
    },
    TIME_FOR_CALLIBRATION_TEST_MS
  )

  test(
    'Test RFCs for horizontal scrollbars at mobile, tablet and desktop viewports (this can take 2.5hrs)',
    async () => {
      const humanTime = Duration.fromObject({ seconds: timeForRfcTests / 1000 })
        .shiftTo('days', 'hours', 'minutes', 'seconds')
        .toHuman()
      console.log('Testing for rendering glitches. This can take ', humanTime)
      const page = await createPage()
      const failures: string[] = []

      for (const rfc of rfcNumbers) {
        const path = infoSeriesPathBuilder(`rfc${rfc}`)

        for (const [label, viewport] of Object.entries(VIEWPORTS)) {
          await page.setViewportSize(viewport)
          await page.goto(url(path), { waitUntil: 'networkidle' })

          const overflow = await testOverflow(page)
          expect(overflow, `RFC${rfc} overflow!`).toBeLessThanOrEqual(0)
          if (overflow > 0) {
            failures.push(`${path} [${label}] overflows by ${overflow}px`)
            console.error(`[${path}] Error. Overflow detected.`)
          } else {
            console.log(`[${path}] [${viewport.width}×${viewport.height}] Success. No rendering glitches detected`)
          }
        }
      }

      await page.close()

      expect(failures, failures.join('\n')).toEqual([])
    },
    timeForRfcTests
  )
})
