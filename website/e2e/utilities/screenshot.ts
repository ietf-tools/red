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
 * Captures are full-page with no height ceiling. A long RFC produces a large PNG, and
 * that cost is accepted: a capture cut off at a fixed height hid defects further down
 * the document, which defeats the point of a layout baseline.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect } from 'vitest'
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
 * Captures the whole scrollable page in a state that is reproducible run to run:
 * scrolled to the top, webfonts resolved, animations and the text caret suppressed,
 * and rasterised at CSS pixel scale so the host's device pixel ratio cannot change
 * the image dimensions.
 */
const captureFullPage = async (page: Page, maskCss: string | undefined): Promise<Buffer> => {
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

  return page.screenshot({
    fullPage: true,
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

  // A full-page capture's height tracks the content, so a size change is itself a
  // regression signal — and pixelmatch cannot diff mismatched dimensions anyway.
  if (baselinePng.width !== actualPng.width || baselinePng.height !== actualPng.height) {
    const actualPath = await writePng(ACTUAL_DIR, fileName, actual)
    const message = `screenshot "${name}" changed size: baseline is ${baselinePng.width}×${baselinePng.height}, got ${actualPng.width}×${actualPng.height}. Captured image written to ${actualPath}`
    if (knownMismatch) {
      console.warn(`[screenshot] known mismatch (${knownMismatch}): ${message}`)
      return
    }
    expect.fail(message)
  }

  const { width, height } = baselinePng
  const diffPng = new PNG({ width, height })
  const diffPixels = pixelmatch(baselinePng.data, actualPng.data, diffPng.data, width, height, {
    threshold: PIXELMATCH_THRESHOLD
  })

  const diffRatio = diffPixels / (width * height)
  if (diffRatio > maxDiffPixelRatio) {
    const actualPath = await writePng(ACTUAL_DIR, fileName, actual)
    const diffPath = await writePng(DIFF_DIR, fileName, PNG.sync.write(diffPng))
    const message = `screenshot "${name}" differs from baseline by ${diffPixels} pixels (${(diffRatio * 100).toFixed(3)}%, tolerance ${(maxDiffPixelRatio * 100).toFixed(3)}%).\n  baseline: ${baselinePath}\n  actual:   ${actualPath}\n  diff:     ${diffPath}\nIf the change is intended, re-record with \`UPDATE_SCREENSHOTS=1 npm run test:e2e\`.`
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
