/**
 * Reading mode: the play button, the highlights it drives, and click-to-seek.
 *
 * Headless Chromium has no voices to speak with, so speechSynthesis is replaced by a recorder that
 * logs each utterance's text. Everything else is the real page: the CSS Custom Highlight API
 * registry is read back to see what is highlighted.
 */
import { describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { infoSeriesPathBuilder } from '../app/utilities/url'
import { openHydratedPage, setupNuxtServer } from './utilities/setup'

/** Small, with prose paragraphs and links. */
const RFC_UNDER_TEST = 'rfc9297'

const TIME_PER_TEST_MS = 60_000

const BUTTON = '[data-reading-mode-button]'

declare global {
  interface Window {
    __spoken: string[]
  }
}

describe('RFC reading mode', async () => {
  await setupNuxtServer()

  const openRfc = async (): Promise<Page> => {
    const page = await openHydratedPage(infoSeriesPathBuilder(RFC_UNDER_TEST), {
      beforeLoad: (loading) =>
        loading.addInitScript(() => {
          window.localStorage.setItem('feature-flag-experiments', JSON.stringify({ hasReadingMode: true }))
          window.__spoken = []
          class RecordingUtterance {
            text: string
            constructor(text: string) {
              this.text = text
            }
          }
          Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: RecordingUtterance, configurable: true })
          const synth = {
            paused: false,
            speak: (utterance: RecordingUtterance) => {
              window.__spoken.push(utterance.text)
            },
            cancel: () => {},
            pause: () => {
              synth.paused = true
            },
            resume: () => {
              synth.paused = false
            },
            getVoices: () => [],
            addEventListener: () => {},
            removeEventListener: () => {}
          }
          Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true })
        })
    })
    await page.locator(BUTTON).waitFor({ state: 'visible' })
    return page
  }

  // Index of a paragraph free of links, so that a click inside it is not taken by a link.
  const plainParagraphIndex = (page: Page, afterIndex = -1) =>
    page.evaluate((after) => {
      const paragraphs = Array.from(document.querySelectorAll('.rfc-content p'))
      return paragraphs.findIndex(
        (paragraph, index) =>
          index > after && !paragraph.querySelector('a') && (paragraph.textContent ?? '').length > 120
      )
    }, afterIndex)

  const clickParagraph = (page: Page, index: number) =>
    page
      .locator('.rfc-content p')
      .nth(index)
      .click({ position: { x: 24, y: 8 } })

  const highlighted = (page: Page, name: string) =>
    page.evaluate((highlightName) => {
      const highlight = CSS.highlights.get(highlightName)
      return highlight ? Array.from(highlight).map((range) => range.toString()) : []
    }, name)

  const spoken = (page: Page) => page.evaluate(() => window.__spoken)

  test(
    'play reads the first sentence and highlights it',
    async () => {
      const page = await openRfc()
      await page.locator(BUTTON).click()
      await expect.poll(() => spoken(page).then((texts) => texts.length)).toBe(1)
      const [firstSpoken] = await spoken(page)
      expect(await highlighted(page, 'rfc-reading-sentence')).toEqual([firstSpoken])
      expect(await page.locator(BUTTON).getAttribute('data-reading-status')).toBe('playing')
      await page.close()
    },
    TIME_PER_TEST_MS
  )

  test(
    'clicking the text moves the highlight without starting to read, and play then starts there',
    async () => {
      const page = await openRfc()
      const paragraph = await plainParagraphIndex(page)
      await clickParagraph(page, paragraph)
      await expect.poll(() => highlighted(page, 'rfc-reading-word').then((words) => words.length)).toBe(1)
      expect(await spoken(page)).toEqual([])
      expect(await page.locator(BUTTON).getAttribute('data-reading-status')).toBe('idle')
      const [word] = await highlighted(page, 'rfc-reading-word')
      await page.locator(BUTTON).click()
      await expect.poll(() => spoken(page).then((texts) => texts.length)).toBe(1)
      expect((await spoken(page))[0]?.startsWith(word ?? '')).toBe(true)
      await page.close()
    },
    TIME_PER_TEST_MS
  )

  test(
    'clicking the text while reading carries on from there',
    async () => {
      const page = await openRfc()
      await page.locator(BUTTON).click()
      await expect.poll(() => spoken(page).then((texts) => texts.length)).toBe(1)
      const paragraph = await plainParagraphIndex(page, 2)
      await clickParagraph(page, paragraph)
      await expect.poll(() => spoken(page).then((texts) => texts.length)).toBe(2)
      expect(await page.locator(BUTTON).getAttribute('data-reading-status')).toBe('playing')
      await page.close()
    },
    TIME_PER_TEST_MS
  )

  test(
    'clicking elsewhere on the page does nothing',
    async () => {
      const page = await openRfc()
      await page.locator('h1').first().click()
      expect(await highlighted(page, 'rfc-reading-word')).toEqual([])
      expect(await spoken(page)).toEqual([])
      await page.close()
    },
    TIME_PER_TEST_MS
  )

  test(
    'the button does not make a 320px page scroll sideways',
    async () => {
      const page = await openRfc()
      await page.setViewportSize({ width: 320, height: 800 })
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
      expect(overflow).toBeLessThanOrEqual(0)
      await page.close()
    },
    TIME_PER_TEST_MS
  )
})
