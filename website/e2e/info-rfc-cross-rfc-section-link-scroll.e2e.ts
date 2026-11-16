/**
 * Where the page ends up after ordinary client-side link clicks between RFC info pages, and after
 * Back and Forward through them. These are the everyday navigations, kept under test so that work on
 * the unusual cases (citation anchors, hashes on the entry Back returns to) can't quietly break them.
 *
 * THE BUG THIS STARTED WITH
 * -------------------------
 * Following a link to a section of a different RFC (e.g. "Section 4 of [RFC8259]" in RFC 9224) is a
 * client-side navigation. The router changes the URL first and the previous RFC stays on screen until
 * the new one's data has loaded. The hash was being scrolled to straight away, so it resolved against
 * the OLD page, which has a `#section-4` of its own, and the reader was left there when the new RFC
 * replaced it.
 *
 * Nothing here waits a fixed time for something to happen. The shared dev server can take a long time
 * to produce an RFC's data when suites run in parallel, so each step waits for the condition it needs,
 * with generous limits, and the only fixed delay is the one the test imposes itself.
 */
import { describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { infoSeriesPathBuilder } from '../app/utilities/url'
import { openHydratedPage, setupNuxtServer } from './utilities/setup'

const FROM_RFC = 'rfc9224'
const TO_RFC = 'rfc8259'
const TO_HASH = '#section-4'
const TO_LINK = `${infoSeriesPathBuilder(TO_RFC)}${TO_HASH}`

const VIEWPORT = { width: 1280, height: 900 }

const DESKTOP_NAV = 'nav[aria-label="In this RFC (desktop menu)"]'

// A wrong landing is thousands of px away, so this tolerance is generous.
const LANDING_TOLERANCE_PX = 150

// Under a parallel run the shared dev server can take a long time to produce an RFC's data.
const RENDER_TIMEOUT_MS = 60_000

// The scroll happens a frame after the new page renders, but a loaded machine can stretch that.
const SCROLL_TIMEOUT_MS = 30_000

const TEST_TIMEOUT_MS = 180_000

// The title separates "RFC" from its number with a non-breaking space.
const titleOf = (page: Page): Promise<string> =>
  page.evaluate(() => (document.querySelector('h1')?.textContent ?? '').replace(/\s+/g, ' ').trim())

const scrollYOf = (page: Page): Promise<number> => page.evaluate(() => Math.round(window.scrollY))

const topOf = async (page: Page, hash: string): Promise<number> => {
  const top = await page.evaluate((id) => {
    const target = document.getElementById(id)
    return target ? Math.round(target.getBoundingClientRect().top) : undefined
  }, hash.slice(1))
  return top ?? Number.POSITIVE_INFINITY
}

const rfcTitle = (rfc: string): string => rfc.replace('rfc', 'RFC ')

const waitForRfc = (page: Page, rfc: string): Promise<unknown> =>
  page.waitForFunction(
    (title) => (document.querySelector('h1')?.textContent ?? '').replace(/\s+/g, ' ').includes(title),
    rfcTitle(rfc),
    { timeout: RENDER_TIMEOUT_MS }
  )

/** Lets anything the router does straight after a navigation, such as an early scroll, run. */
const letNavigationSettle = (page: Page): Promise<unknown> =>
  page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))

const expectNear = (read: () => Promise<number>, target: number, message: string): Promise<void> =>
  expect
    .poll(async () => Math.abs((await read()) - target), { timeout: SCROLL_TIMEOUT_MS, message })
    .toBeLessThanOrEqual(LANDING_TOLERANCE_PX)

const openRfc = async (rfc: string): Promise<Page> => {
  const page = await openHydratedPage(infoSeriesPathBuilder(rfc))
  await page.setViewportSize(VIEWPORT)
  await page.locator('.rfc-content').first().waitFor({ state: 'visible' })
  return page
}

describe('info/rfcN client-side link navigation', async () => {
  await setupNuxtServer()

  test(
    'a link to a section of another RFC scrolls to that section of the new RFC',
    async () => {
      const page = await openRfc(FROM_RFC)

      const link = page.locator(`.rfc-content a[href="${TO_LINK}"]`).first()
      await link.scrollIntoViewIfNeeded()
      await link.click()
      await page.waitForURL(`**${TO_LINK}`)
      await waitForRfc(page, TO_RFC)

      await expectNear(() => topOf(page, TO_HASH), 0, `${TO_HASH} should end up at the top of the window`)
      await page.close()
    },
    TEST_TIMEOUT_MS
  )

  test(
    'Back returns to the reading position in the first RFC, and Forward to the section again',
    async () => {
      const page = await openRfc(FROM_RFC)

      const link = page.locator(`.rfc-content a[href="${TO_LINK}"]`).first()
      await link.scrollIntoViewIfNeeded()
      const beforeY = await scrollYOf(page)
      await link.click()
      await page.waitForURL(`**${TO_LINK}`)
      await waitForRfc(page, TO_RFC)

      await page.goBack()
      await waitForRfc(page, FROM_RFC)
      await expectNear(() => scrollYOf(page), beforeY, `Back should restore scroll to ~${beforeY}px`)

      await page.goForward()
      await waitForRfc(page, TO_RFC)
      await expectNear(() => topOf(page, TO_HASH), 0, `Forward should return to ${TO_HASH}`)

      await page.close()
    },
    TEST_TIMEOUT_MS
  )

  test(
    'a link to another RFC with no hash opens it at the top, and Back restores the reading position',
    async () => {
      const page = await openRfc(FROM_RFC)

      const href = await page.evaluate((own) => {
        const anchors = document.querySelectorAll<HTMLAnchorElement>('.rfc-content a[href^="/info/rfc"]')
        const match = [...anchors].find((anchor) => {
          const value = anchor.getAttribute('href') ?? ''
          return !value.includes('#') && !value.includes(own)
        })
        return match?.getAttribute('href')
      }, FROM_RFC)
      expect(href, 'expected a link to another RFC without a hash').toBeTruthy()

      const link = page.locator(`.rfc-content a[href="${href}"]`).first()
      await link.scrollIntoViewIfNeeded()
      const beforeY = await scrollYOf(page)
      expect(beforeY, 'the link should be well down the page').toBeGreaterThan(LANDING_TOLERANCE_PX)
      await link.click()
      await page.waitForFunction(
        (title) => !(document.querySelector('h1')?.textContent ?? '').replace(/\s+/g, ' ').includes(title),
        rfcTitle(FROM_RFC),
        { timeout: RENDER_TIMEOUT_MS }
      )
      await expectNear(() => scrollYOf(page), 0, 'the new RFC should open at the top')

      await page.goBack()
      await waitForRfc(page, FROM_RFC)
      await expectNear(() => scrollYOf(page), beforeY, `Back should restore scroll to ~${beforeY}px`)

      await page.close()
    },
    TEST_TIMEOUT_MS
  )

  test(
    'while the new RFC is loading the first one stays where it is, then the section is scrolled to',
    async () => {
      const page = await openRfc(FROM_RFC)

      // The new RFC's data is held until the test lets it go, so what the page does while waiting for it
      // is observed rather than raced against.
      let releaseData: () => void = () => undefined
      const dataHeld = new Promise<void>((resolve) => {
        releaseData = resolve
      })
      await page.route(`**/api/v1/rfc-*/${TO_RFC.replace('rfc', '')}.json`, async (route) => {
        await dataHeld
        await route.continue()
      })

      const link = page.locator(`.rfc-content a[href="${TO_LINK}"]`).first()
      await link.scrollIntoViewIfNeeded()
      const startY = await scrollYOf(page)
      await link.click()
      await page.waitForURL(`**${TO_LINK}`)
      await letNavigationSettle(page)

      const midHeading = await titleOf(page)
      const midY = await scrollYOf(page)

      releaseData()
      await waitForRfc(page, TO_RFC)
      await expectNear(() => topOf(page, TO_HASH), 0, `${TO_HASH} should end up at the top of the window`)

      await page.close()

      expect(midHeading, 'the first RFC should still be showing while the second loads').toContain(rfcTitle(FROM_RFC))
      expect(
        Math.abs(midY - startY),
        `the first RFC should not scroll while the second loads, but moved from ${startY}px to ${midY}px`
      ).toBeLessThanOrEqual(5)
    },
    TEST_TIMEOUT_MS
  )

  test(
    'a table of contents link scrolls to its section, Back restores the position and Forward returns',
    async () => {
      const page = await openRfc(FROM_RFC)

      const link = page.locator(`${DESKTOP_NAV} a[href="${TO_HASH}"]`).first()
      await link.waitFor({ state: 'visible' })
      await page.evaluate(() => window.scrollTo({ top: 1200, behavior: 'instant' }))
      await expect.poll(() => scrollYOf(page), { timeout: SCROLL_TIMEOUT_MS }).toBeGreaterThan(1000)
      const beforeY = await scrollYOf(page)

      await link.click()
      await expectNear(() => topOf(page, TO_HASH), 0, `the table of contents link should land on ${TO_HASH}`)

      await page.goBack()
      await expectNear(() => scrollYOf(page), beforeY, `Back should restore scroll to ~${beforeY}px`)

      await page.goForward()
      await expectNear(() => topOf(page, TO_HASH), 0, `Forward should return to ${TO_HASH}`)

      await page.close()
    },
    TEST_TIMEOUT_MS
  )

  test(
    'navigating from another page to an RFC opens it at the top',
    async () => {
      const page = await openHydratedPage('/')
      await page.setViewportSize(VIEWPORT)
      await page.evaluate(() => window.scrollTo({ top: 600, behavior: 'instant' }))
      await page.evaluate((path) => window.useNuxtApp?.().$router.push(path), infoSeriesPathBuilder(FROM_RFC))
      await waitForRfc(page, FROM_RFC)

      await expectNear(() => scrollYOf(page), 0, 'the RFC should open at the top')
      await page.close()
    },
    TEST_TIMEOUT_MS
  )
})
