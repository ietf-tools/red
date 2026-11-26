/**
 * Where /rfc-index/ lands after a link to one of its rows, with the sticky table header in view.
 *
 * The links in its table of contents are handled by the page and followed with `router.push`, and
 * vue-router does the scrolling for a hash itself. The browser's own handling of `scroll-margin-top` on
 * the target therefore doesn't apply unless the router is given it as the scroll offset, and without it
 * the row was left underneath the sticky header. The margin is on the row, not the link in it, because on a
 * narrow screen a wrapped title makes the row taller than the link, and the row's top is what must clear.
 *
 * The real index is thousands of rows, which is slow to render and, on the dev server every suite shares,
 * slows the other suites' page loads past their limits. So the page is reached client-side, where its data is
 * requested by the browser and can be a few dozen rows. A page loaded by address with a hash is not covered
 * here for that reason.
 */
import { describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { openHydratedPage, setupNuxtServer } from './utilities/setup'

// Narrow, where a title wraps and a row is taller than the link in it.
const VIEWPORT = { width: 390, height: 800 }

const MINI_INDEX_PATH = '**/api/v1/rfc-mini-index.json'

// Enough rows either side of each table of contents entry that the page can scroll one to the top of the window.
const CHUNK_STARTS = [0, 1000, 2000, 3000]
const ROWS_PER_CHUNK = 40

// The table of contents links to the lowest number in each thousand after the first, and to the highest.
const FIRST_LINKED_ROW = 'rfc1000'

// Long enough to wrap onto several lines at VIEWPORT.
const LONG_TITLE = 'A deliberately long title that has to wrap onto several lines on a narrow screen to make a tall row'

const TABLE_OF_CONTENTS_LINK = 'a[href^="#rfc"]'

// Under a parallel run the shared dev server can be slow to hand over a page.
const RENDER_TIMEOUT_MS = 60_000

// The scroll happens a frame after the navigation, and a loaded machine can stretch that.
const SCROLL_TIMEOUT_MS = 30_000

const TEST_TIMEOUT_MS = 120_000

// Pixels of difference between where the row should sit and where it does, to allow for rounding.
const POSITION_TOLERANCE_PX = 3

// The first chunk starts at 1 (there is no RFC 0), and the others at their round number.
const miniIndex = {
  createdOn: '2026-01-01T00:00:00Z',
  miniIndex: CHUNK_STARTS.flatMap((start) =>
    Array.from({ length: ROWS_PER_CHUNK }, (_, offset) => {
      const number = (start === 0 ? 1 : start) + offset
      return {
        number,
        title: `${LONG_TITLE} (${number})`,
        status: { slug: 'unkn', name: 'unknown' },
        stream: { slug: 'Legacy', name: 'Legacy' },
        authors: [{ titlepage_name: 'A. Author' }],
        formats: [],
        published: '2000-01-01'
      }
    })
  )
}

type Landing = { rowTop: number; headerBottom: number; scrollMargin: number }

const readLanding = (page: Page): Promise<Landing> =>
  page.evaluate(() => {
    const target = document.getElementById(location.hash.slice(1))
    const header = document.querySelector('thead th')
    if (!target || !header) {
      throw Error(`Expected a row for ${location.hash} and a table header`)
    }
    return {
      rowTop: target.getBoundingClientRect().top,
      headerBottom: header.getBoundingClientRect().bottom,
      scrollMargin: Number.parseFloat(getComputedStyle(target).scrollMarginTop)
    }
  })

// Starts on a page that is quick to load, with the index's data replaced, at the narrow size.
const openHome = (): Promise<Page> =>
  openHydratedPage('/', {
    beforeLoad: async (page) => {
      await page.setViewportSize(VIEWPORT)
      await page.route(MINI_INDEX_PATH, (route) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(miniIndex) })
      )
    }
  })

const goTo = (page: Page, path: string): Promise<unknown> =>
  page.evaluate((target) => window.useNuxtApp?.().$router.push(target), path)

// Polls, because the page scrolls after the navigation rather than during it.
const expectClearOfHeader = async (page: Page): Promise<void> => {
  await expect
    .poll(
      async () => {
        const { rowTop, scrollMargin } = await readLanding(page)
        return Math.abs(rowTop - scrollMargin)
      },
      { timeout: SCROLL_TIMEOUT_MS, message: 'the row should sit its scroll margin below the top of the window' }
    )
    .toBeLessThanOrEqual(POSITION_TOLERANCE_PX)

  const { rowTop, headerBottom, scrollMargin } = await readLanding(page)
  expect(scrollMargin, 'the row should have a scroll margin to honour').toBeGreaterThan(0)
  expect(rowTop, 'the row should start below the sticky header, not under it').toBeGreaterThanOrEqual(headerBottom)
}

describe('rfc-index links to a row', async () => {
  await setupNuxtServer()

  test(
    'following a table of contents link leaves the row below the sticky header',
    async () => {
      const page = await openHome()
      await goTo(page, '/rfc-index/')
      await page.locator('tbody tr').first().waitFor({ state: 'visible', timeout: RENDER_TIMEOUT_MS })

      const link = page.locator(TABLE_OF_CONTENTS_LINK).first()
      const href = await link.getAttribute('href')
      expect(href, 'expected a table of contents link').toBe(`#${FIRST_LINKED_ROW}`)
      await link.click()
      await page.waitForURL(`**${href}`)

      await expectClearOfHeader(page)
      await page.close()
    },
    TEST_TIMEOUT_MS
  )
})
