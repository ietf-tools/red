/**
 * Text size and spacing settings in a real browser, where two things can go wrong that a component
 * test cannot see.
 *
 * Spacing changes the width of the text the precomputer measured, so the word-break rules in
 * xml2rfc.css have to keep their breaks live where a spaced word no longer fits. And a reset has to
 * reach the page and storage, not only the slider.
 */
import { describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { infoSeriesPathBuilder } from '../app/utilities/url'
import {
  MAX_LETTER_SPACING_STEP,
  MAX_LINE_SPACING_STEP,
  MAX_PARAGRAPH_SPACING_STEP,
  MAX_WORD_SPACING_STEP
} from '../app/utilities/text-spacing'
import { openHydratedPage, setupNuxtServer } from './utilities/setup'

/** Small, has both a references list and underscore identifiers. */
const RFC_UNDER_TEST = 'rfc9297'

const REFLOW_VIEWPORT = { width: 320, height: 800 } as const
const DESKTOP_VIEWPORT = { width: 1400, height: 900 } as const

const TIME_PER_TEST_MS = 90_000

const FEATURE_FLAGS_STORAGE_KEY = 'feature-flag-experiments'
const UI_SETTINGS_STORAGE_KEY = 'rfc-ui'

const enableTextScale = (page: Page, uiSettings?: Record<string, number>) =>
  page.addInitScript(
    ({ featureFlagsKey, uiSettingsKey, settings }) => {
      window.localStorage.setItem(featureFlagsKey, JSON.stringify({ hasTextScale: true }))
      if (settings) {
        window.localStorage.setItem(uiSettingsKey, JSON.stringify(settings))
      }
    },
    { featureFlagsKey: FEATURE_FLAGS_STORAGE_KEY, uiSettingsKey: UI_SETTINGS_STORAGE_KEY, settings: uiSettings }
  )

const MAXIMUM_SPACING = {
  lineSpacingStep: MAX_LINE_SPACING_STEP,
  letterSpacingStep: MAX_LETTER_SPACING_STEP,
  wordSpacingStep: MAX_WORD_SPACING_STEP,
  paragraphSpacingStep: MAX_PARAGRAPH_SPACING_STEP,
  textScale: 1.5
}

describe('text size and spacing', async () => {
  await setupNuxtServer()

  const openRfc = async ({
    viewport,
    settings
  }: {
    viewport: { width: number; height: number }
    settings?: Record<string, number>
  }) => {
    const page = await openHydratedPage(infoSeriesPathBuilder(RFC_UNDER_TEST), {
      beforeLoad: async (loading) => {
        await loading.setViewportSize(viewport)
        await enableTextScale(loading, settings)
      }
    })
    await page.locator('.rfc-content wbr').first().waitFor({ state: 'attached' })
    return page
  }

  const readOverflow = (page: Page) =>
    page.evaluate(() => {
      const overflowingText = Array.from(document.querySelectorAll('.rfc-content p, .rfc-content li, .rfc-content dd'))
        .filter((element) => element.scrollWidth > element.clientWidth + 1)
        .map((element) => `${element.tagName.toLowerCase()}: ${(element.textContent ?? '').trim().slice(0, 60)}`)
      // Names whatever reaches past the screen's edge, since a bare pixel count says nothing about where.
      const stickingOut = Array.from(document.querySelectorAll('.rfc-content *'))
        .filter((element) => element.getBoundingClientRect().right > document.documentElement.clientWidth + 1)
        .slice(0, 5)
        .map(
          (element) =>
            `${element.tagName.toLowerCase()}.${element.className} (${Math.round(element.getBoundingClientRect().right)}px): ${(element.textContent ?? '').trim().slice(0, 50)}`
        )
      return {
        documentOverflowPx: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
        overflowingText,
        stickingOut
      }
    })

  test(
    'applies the chosen spacing to prose but leaves preformatted text alone',
    async () => {
      const page = await openRfc({ viewport: DESKTOP_VIEWPORT, settings: MAXIMUM_SPACING })
      const styles = await page.evaluate(() => {
        const content = document.querySelector('.rfc-content')
        const paragraph = document.querySelector('.rfc-content p')
        const pre = document.querySelector('.rfc-content pre')
        return {
          letterStep: content?.getAttribute('data-letter-step'),
          wordStep: content?.getAttribute('data-word-step'),
          paragraphLetterSpacing: paragraph ? getComputedStyle(paragraph).letterSpacing : 'no paragraph',
          preLetterSpacing: pre ? getComputedStyle(pre).letterSpacing : 'no pre',
          preWordSpacing: pre ? getComputedStyle(pre).wordSpacing : 'no pre'
        }
      })
      await page.close()

      expect(styles.letterStep).toBe(String(MAX_LETTER_SPACING_STEP))
      expect(styles.wordStep).toBe(String(MAX_WORD_SPACING_STEP))
      expect(styles.paragraphLetterSpacing).not.toBe('normal')
      expect(styles.preLetterSpacing).toBe('normal')
      // A word spacing of normal is reported by the browser as zero.
      expect(styles.preWordSpacing).toBe('0px')
    },
    TIME_PER_TEST_MS
  )

  test.each(Array.from({ length: MAX_LETTER_SPACING_STEP + 1 }, (_, step) => step))(
    'at letter spacing step %i the page still does not overflow on a narrow screen',
    async (step) => {
      const page = await openRfc({
        viewport: REFLOW_VIEWPORT,
        // Word spacing is raised to the letter step by the app, so only the letter step is set.
        settings: { letterSpacingStep: step, wordSpacingStep: step }
      })
      const { documentOverflowPx, overflowingText, stickingOut } = await readOverflow(page)
      await page.close()

      expect(overflowingText).toEqual([])
      expect(stickingOut).toEqual([])
      expect(documentOverflowPx).toBe(0)
    },
    TIME_PER_TEST_MS
  )

  test(
    'at the maximum of every spacing the page does not overflow on a narrow screen',
    async () => {
      const page = await openRfc({ viewport: REFLOW_VIEWPORT, settings: MAXIMUM_SPACING })
      const { documentOverflowPx, overflowingText, stickingOut } = await readOverflow(page)
      await page.close()

      expect(overflowingText).toEqual([])
      expect(stickingOut).toEqual([])
      expect(documentOverflowPx).toBe(0)
    },
    TIME_PER_TEST_MS
  )

  test(
    'reset puts the page, the slider and the stored value back to the default',
    async () => {
      const page = await openRfc({ viewport: DESKTOP_VIEWPORT })

      const openSettings = async () => {
        await page.getByRole('button', { name: 'User menu' }).click()
        await page.getByRole('button', { name: 'Advanced Settings' }).click()
        await page.getByRole('slider', { name: 'Letter spacing' }).waitFor({ state: 'visible' })
      }

      await openSettings()
      await page.getByRole('slider', { name: 'Letter spacing' }).fill('4')
      await page.waitForFunction(() => document.querySelector('.rfc-content')?.getAttribute('data-letter-step') === '4')

      await page.getByRole('button', { name: 'Reset letter spacing to default' }).click()
      await page.waitForFunction(() => !document.querySelector('.rfc-content')?.hasAttribute('data-letter-step'))

      const stored = await page.evaluate((key) => window.localStorage.getItem(key), UI_SETTINGS_STORAGE_KEY)
      expect(JSON.parse(stored ?? '{}')).not.toHaveProperty('letterSpacingStep')

      // Reopening shows the default again rather than the value before the reset.
      await page.keyboard.press('Escape')
      await openSettings()
      expect(await page.getByRole('slider', { name: 'Letter spacing' }).inputValue()).toBe('0')
      await page.close()
    },
    TIME_PER_TEST_MS
  )

  // Reads what the reader sees for every element under the sidebar and the document, so a default
  // that is missing from one branch shows up as a difference without naming the property in advance.
  const readComputedStyles = (page: Page) =>
    page.evaluate(() => {
      const roots = [document.querySelector('[role="tablist"]')?.parentElement, document.querySelector('.rfc-content')]
      return roots.flatMap((root) =>
        root
          ? [root, ...Array.from(root.querySelectorAll('*'))].map((element) => {
              const { fontSize, lineHeight, letterSpacing, wordSpacing, marginBottom } = getComputedStyle(element)
              return `${element.tagName} ${fontSize} ${lineHeight} ${letterSpacing} ${wordSpacing} ${marginBottom}`
            })
          : []
      )
    })

  test.each([DESKTOP_VIEWPORT, REFLOW_VIEWPORT])(
    'enabling the feature at its defaults changes nothing on a %o screen',
    async (viewport) => {
      const withoutFeature = await openHydratedPage(infoSeriesPathBuilder(RFC_UNDER_TEST), {
        beforeLoad: (loading) => loading.setViewportSize(viewport)
      })
      await withoutFeature.locator('.rfc-content wbr').first().waitFor({ state: 'attached' })
      const before = await readComputedStyles(withoutFeature)
      await withoutFeature.close()

      const withFeature = await openRfc({ viewport })
      const after = await readComputedStyles(withFeature)
      await withFeature.close()

      expect(before.length).toBeGreaterThan(0)
      expect(after).toEqual(before)
    },
    TIME_PER_TEST_MS
  )
})
