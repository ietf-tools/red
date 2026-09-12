/**
 * Full-page screenshot regression testing for the e2e suite.
 *
 * WHY THIS EXISTS
 * ---------------
 * Vitest ships no image comparison outside of browser mode (`@vitest/browser`'s
 * `toMatchScreenshot`), and browser mode cannot drive a real server route — its
 * `page` has no navigation API. The e2e project instead runs in `environment: 'node'`
 * against genuine Playwright pages from `@nuxt/test-utils`, so the baseline compare
 * is done here: pixelmatch over the decoded PNGs, which is the same approach
 * `@playwright/test`'s `toHaveScreenshot()` takes internally.
 *
 * BASELINES ARE PLATFORM-SPECIFIC
 * -------------------------------
 * Font rasterisation differs between operating systems, so an image captured on one
 * platform will never match one captured on another. Baselines are therefore stored
 * with a `process.platform` suffix and must be generated on the same platform CI
 * runs on, or every run fails on antialiasing noise alone.
 *
 * WORKFLOW
 * --------
 * A missing baseline is written and the check passes, so a new screenshot test is
 * usable immediately — except under `CI`, where a missing baseline is a failure
 * (an unreviewed baseline committed by the pipeline would assert nothing).
 * Set `UPDATE_SCREENSHOTS=1` to re-record every baseline after an intended visual
 * change. Failures write the captured image and a highlighted diff for inspection.
 *
 * Captures are full-page up to MAX_CAPTURE_HEIGHT_PX; see that constant for why there is
 * a ceiling. Layout below it is not asserted.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect } from 'vitest'
import { waitForHydration } from '@nuxt/test-utils/e2e'
import pixelmatch from 'pixelmatch'
import { PNG } from 'pngjs'
import type { Page } from 'playwright-core'

const SCREENSHOTS_DIR = fileURLToPath(new URL('../screenshots/', import.meta.url))

/** Committed reference images. */
const BASELINE_DIR = join(SCREENSHOTS_DIR, 'baseline')

/** What the run actually captured, written only when a comparison fails. */
const ACTUAL_DIR = join(SCREENSHOTS_DIR, 'actual')

/** Per-pixel differences highlighted over a dimmed copy of the baseline. */
const DIFF_DIR = join(SCREENSHOTS_DIR, 'diff')

/**
 * Per-channel colour distance below which pixelmatch treats two pixels as equal.
 * Low enough to catch a real rendering change, high enough to absorb the subpixel
 * antialiasing jitter that the same browser produces between runs.
 */
const PIXELMATCH_THRESHOLD = 0.1

/** Fraction of differing pixels tolerated before a comparison is considered a failure. */
const DEFAULT_MAX_DIFF_PIXEL_RATIO = 0.001

/** Time allowed for late layout shifts (webfont swap, image decode) to settle before capture. */
const SETTLE_BEFORE_CAPTURE_MS = 400

/**
 * Height at which a capture is cut off.
 *
 * Chromium leaves whole regions of a very long full-page capture blank, and which regions
 * shifts with CPU load: the longest RFCs captured with white bands from around 150,000px down
 * even on an idle machine, and under a 4-CPU soak the bands moved between runs while every
 * shorter document captured identically. Past this height a comparison measures rasterisation
 * luck rather than layout, so the ceiling trades coverage of the tail for a stable baseline.
 *
 * DO NOT raise this without re-running that soak. On a 4-CPU-pinned, cold-cache soak matching
 * a GitHub Actions runner, the layout suite failed 3 of 10 runs with no ceiling (maxConcurrency
 * 2) and 0 of 30 with this ceiling at 100,000px (maxConcurrency 4) — always on the tallest
 * captures, and always the same blank-band symptom. Raising the ceiling reopens that failure
 * mode; it will not reproduce on an idle local machine, only under CI-like CPU pressure.
 */
const MAX_CAPTURE_HEIGHT_PX = 100_000

/**
 * How long the DOM must go without a mutation before the page counts as settled after hydration.
 * Long enough to outlast the debounced observers the app runs on mount, short enough not to
 * dominate a suite that captures dozens of documents.
 */
const DOM_QUIET_MS = 500

/**
 * Upper bound on waiting for the DOM to go quiet. A page with something that mutates on a timer
 * would otherwise hold the capture forever; past this the capture proceeds with whatever state the
 * page is in, and the comparison reports the consequence.
 */
const DOM_QUIET_TIMEOUT_MS = 10_000

type ScreenshotOptions = {
  /**
   * CSS injected immediately before capture. Use it to neutralise content that
   * legitimately changes between runs — anything driven by live API data or by the
   * current date — so the rest of the page can still be compared.
   */
  maskCss?: string
  /** Overrides DEFAULT_MAX_DIFF_PIXEL_RATIO for a page with unavoidable noise. */
  maxDiffPixelRatio?: number
  /**
   * A known, tracked visual defect. The capture, the diff and the baseline are all still
   * produced, so the evidence stays current, but a mismatch is reported rather than failed.
   * The value is the reason, printed with every report so nobody has to go looking for it.
   * Remove the option once the defect is fixed; the helper says so when the comparison clears.
   */
  knownMismatch?: string
}

export const isTruthyEnv = (value: string | undefined): boolean => value !== undefined && value !== '' && value !== '0'

const baselineFileNameFor = (name: string): string => `${name}-${process.platform}.png`

const writePng = async (directory: string, fileName: string, data: Buffer): Promise<string> => {
  await mkdir(directory, { recursive: true })
  const path = join(directory, fileName)
  await writeFile(path, data)
  return path
}

/**
 * pixelmatch refuses images of unequal dimensions, and a full-page capture changes height whenever
 * the content reflows, so both sides are laid onto a canvas the size of the larger before they are
 * compared. The padding is white to match the page background, so the highlighted difference is
 * the reflow itself rather than a solid block where the shorter image ends.
 */
const padTo = (png: PNG, width: number, height: number): PNG => {
  if (png.width === width && png.height === height) {
    return png
  }
  const padded = new PNG({ width, height })
  padded.data.fill(255)
  const rowBytes = png.width * 4
  for (let y = 0; y < png.height; y++) {
    png.data.copy(padded.data, y * width * 4, y * rowBytes, (y + 1) * rowBytes)
  }
  return padded
}

const readPngIfPresent = async (path: string): Promise<Buffer | undefined> => {
  try {
    return await readFile(path)
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return undefined
    }
    throw error
  }
}

/**
 * Waits until the app has hydrated and the client-only rendering that follows has landed.
 *
 * Nuxt clears `isHydrating` when the root Suspense resolves, which Vue fires before it flushes the
 * queued mounted hooks. Components that render something only once mounted — the copy button on
 * tables and artwork, the sticky sidebar — re-render after that flag flips, so a capture taken at
 * the flag alone is a coin toss between the two states (RFC 9559 at 320px: 54 bands of diff, all
 * copy buttons). Waiting for the DOM to stop changing catches every such render at once, rather
 * than naming each component that has one.
 */
const waitForHydratedAndSettled = async (page: Page): Promise<void> => {
  await waitForHydration(page, page.url(), 'hydration')
  await page.evaluate(
    ({ quietMs, timeoutMs }) =>
      new Promise<void>((resolve) => {
        let quietTimer: ReturnType<typeof setTimeout> | undefined
        const observer = new MutationObserver(() => {
          clearTimeout(quietTimer)
          quietTimer = setTimeout(finish, quietMs)
        })
        const deadline = setTimeout(() => finish(), timeoutMs)
        const finish = (): void => {
          observer.disconnect()
          clearTimeout(quietTimer)
          clearTimeout(deadline)
          resolve()
        }
        observer.observe(document.documentElement, {
          subtree: true,
          childList: true,
          attributes: true,
          characterData: true
        })
        quietTimer = setTimeout(finish, quietMs)
      }),
    { quietMs: DOM_QUIET_MS, timeoutMs: DOM_QUIET_TIMEOUT_MS }
  )
}

/**
 * Captures the whole scrollable page in a state that is reproducible run to run:
 * hydrated and settled, scrolled to the top, webfonts resolved, animations and the
 * text caret suppressed, and rasterised at CSS pixel scale so the host's device pixel
 * ratio cannot change the image dimensions.
 */
const captureFullPage = async (page: Page, maskCss: string | undefined): Promise<Buffer> => {
  await waitForHydratedAndSettled(page)

  if (maskCss) {
    await page.addStyleTag({ content: maskCss })
  }

  await page.evaluate(() => {
    window.scrollTo(0, 0)
  })

  // `document.fonts.ready` resolves to a FontFaceSet, which cannot cross the
  // page/node boundary — discard it so only the wait is observed here.
  await page.evaluate(() => document.fonts.ready.then(() => undefined))
  await page.waitForTimeout(SETTLE_BEFORE_CAPTURE_MS)

  // With `fullPage`, Playwright trims the clip to the document's own size, so the width needs
  // no measuring here: only the height ceiling has any effect.
  return page.screenshot({
    fullPage: true,
    clip: { x: 0, y: 0, width: Number.MAX_SAFE_INTEGER, height: MAX_CAPTURE_HEIGHT_PX },
    animations: 'disabled',
    caret: 'hide',
    scale: 'css'
  })
}

/**
 * Captures a full-page screenshot and asserts it matches the committed baseline.
 *
 * Call this on a freshly loaded page, before the test drives any interaction — the
 * post-load state is the one that stays stable as the surrounding test evolves.
 */
export const expectScreenshotToMatchBaseline = async (
  page: Page,
  name: string,
  options: ScreenshotOptions = {}
): Promise<void> => {
  const { maskCss, maxDiffPixelRatio = DEFAULT_MAX_DIFF_PIXEL_RATIO, knownMismatch } = options

  const actual = await captureFullPage(page, maskCss)

  const fileName = baselineFileNameFor(name)
  const baselinePath = join(BASELINE_DIR, fileName)
  const baseline = await readPngIfPresent(baselinePath)

  if (isTruthyEnv(process.env.UPDATE_SCREENSHOTS)) {
    await writePng(BASELINE_DIR, fileName, actual)
    console.log(`[screenshot] re-recorded baseline ${baselinePath}`)
    return
  }

  if (!baseline) {
    // Recording a baseline on CI would compare the run against itself, so the check
    // has to fail loudly and let a human record and review the image locally.
    expect(
      isTruthyEnv(process.env.CI),
      `no screenshot baseline for "${name}" on ${process.platform}. Record one locally with \`UPDATE_SCREENSHOTS=1 npm run test:e2e\` and commit ${baselinePath}`
    ).toBe(false)

    await writePng(BASELINE_DIR, fileName, actual)
    console.log(`[screenshot] recorded new baseline ${baselinePath}`)
    return
  }

  const baselinePng = PNG.sync.read(baseline)
  const actualPng = PNG.sync.read(actual)

  const width = Math.max(baselinePng.width, actualPng.width)
  const height = Math.max(baselinePng.height, actualPng.height)
  const diffPng = new PNG({ width, height })
  const diffPixels = pixelmatch(
    padTo(baselinePng, width, height).data,
    padTo(actualPng, width, height).data,
    diffPng.data,
    width,
    height,
    { threshold: PIXELMATCH_THRESHOLD }
  )

  // A capture's height tracks the content up to MAX_CAPTURE_HEIGHT_PX, so a size change is itself
  // a regression signal, however few pixels moved.
  const sizeChanged = baselinePng.width !== actualPng.width || baselinePng.height !== actualPng.height
  const diffRatio = diffPixels / (width * height)
  if (sizeChanged || diffRatio > maxDiffPixelRatio) {
    const actualPath = await writePng(ACTUAL_DIR, fileName, actual)
    const diffPath = await writePng(DIFF_DIR, fileName, PNG.sync.write(diffPng))
    const reason = sizeChanged
      ? `changed size: baseline is ${baselinePng.width}×${baselinePng.height}, got ${actualPng.width}×${actualPng.height}`
      : `differs from baseline by ${diffPixels} pixels (${(diffRatio * 100).toFixed(3)}%, tolerance ${(maxDiffPixelRatio * 100).toFixed(3)}%)`
    const message = `screenshot "${name}" ${reason}.\n  baseline: ${baselinePath}\n  actual:   ${actualPath}\n  diff:     ${diffPath}\nIf the change is intended, re-record with \`UPDATE_SCREENSHOTS=1 npm run test:e2e\`.`
    if (knownMismatch) {
      console.warn(`[screenshot] known mismatch (${knownMismatch}): ${message}`)
      return
    }
    expect.fail(message)
  }

  if (knownMismatch) {
    console.warn(
      `[screenshot] "${name}" now matches its baseline; the known mismatch (${knownMismatch}) has cleared, so remove the knownMismatch option.`
    )
  }
}
