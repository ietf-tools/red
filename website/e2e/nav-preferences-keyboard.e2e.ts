// Keyboard behaviour of the "Your preferences" theme radio group and UI-settings
// checkbox group in the header nav, on both the desktop (NavigationMenu) and
// mobile (Dialog + Accordion) renderers.
//
// These guard a fiddly interaction: the radio/checkbox groups use Reka's roving
// focus, but they are nested inside NavigationMenu (desktop) and Accordion
// (mobile), both of which run their own arrow-key navigation over every nested
// collection item. See HeaderNavDesktop.vue / HeaderNavMobile.vue.
import { describe, expect, test } from 'vitest'
import { createPage, setup } from '@nuxt/test-utils/e2e'
import type { Page } from 'playwright-core'

const TEST_TIMEOUT_MS = 60_000

const checkedStates = (page: Page) =>
  page.evaluate(() =>
    Array.from(document.querySelectorAll('[role="radio"]')).map((el) => el.getAttribute('aria-checked'))
  )

const activeInfo = (page: Page) =>
  page.evaluate(() => ({
    role: document.activeElement?.getAttribute('role') ?? null,
    isAccordionHeader: document.activeElement?.getAttribute('aria-expanded') !== null
  }))

describe('header preferences keyboard nav', async () => {
  await setup({ browser: true, dev: true })

  test(
    'desktop: arrows move selection within the theme radio group and wrap without escaping',
    async () => {
      const page = await createPage('/')
      await page.setViewportSize({ width: 1400, height: 900 })
      await page.locator('text=Latest RFCs').first().waitFor({ state: 'visible' })

      // Open the "Your preferences" dropdown (the mobile trigger is hidden here).
      await page.getByRole('button', { name: 'Your preferences' }).click()

      const radios = page.getByRole('radio')
      await radios.first().waitFor({ state: 'visible' })
      expect(await radios.count()).toBe(3)

      // The groups expose their heading as an accessible name.
      expect(await page.getByRole('radiogroup', { name: 'Theme' }).count()).toBe(1)
      expect(await page.getByRole('group', { name: 'UI settings' }).count()).toBe(1)

      // Focus the currently-selected radio.
      const initial = await checkedStates(page)
      const startIndex = initial.indexOf('true')
      expect(startIndex).toBeGreaterThanOrEqual(0)
      await radios.nth(startIndex).focus()

      // ArrowDown selects the next option (selection follows focus, per APG).
      await page.keyboard.press('ArrowDown')
      await page.waitForTimeout(50)
      const afterDown = await checkedStates(page)
      expect(afterDown[(startIndex + 1) % 3]).toBe('true')
      expect(afterDown.filter((s) => s === 'true')).toHaveLength(1)
      expect((await activeInfo(page)).role).toBe('radio')

      // ArrowUp goes back.
      await page.keyboard.press('ArrowUp')
      await page.waitForTimeout(50)
      expect((await checkedStates(page))[startIndex]).toBe('true')

      // Wrapping past the ends keeps focus inside the group (never escapes to the
      // checkbox group or links).
      await page.keyboard.press('ArrowUp')
      await page.keyboard.press('ArrowUp')
      await page.waitForTimeout(50)
      expect((await activeInfo(page)).role).toBe('radio')

      await page.close()
    },
    TEST_TIMEOUT_MS
  )

  test(
    'mobile: arrows from an accordion header stay on headers and never change the theme',
    async () => {
      const page = await createPage('/')
      await page.setViewportSize({ width: 390, height: 844 })
      await page.locator('text=Latest RFCs').first().waitFor({ state: 'visible' })

      // Open the mobile menu dialog and expand "Your preferences".
      await page.getByRole('button', { name: 'Menu' }).click()
      const preferencesHeader = page.getByRole('button', { name: 'Your preferences' })
      await preferencesHeader.waitFor({ state: 'visible' })
      await preferencesHeader.click()

      const radios = page.getByRole('radio')
      await radios.first().waitFor({ state: 'visible' })

      // Focus the accordion header itself, then press Down.
      await preferencesHeader.focus()
      const before = await checkedStates(page)

      await page.keyboard.press('ArrowDown')
      await page.waitForTimeout(50)

      // Focus must NOT have dived into the radio group, and the theme selection
      // must be unchanged (regression guard for the auto-select-on-arrow bug).
      const after = await checkedStates(page)
      expect(after).toEqual(before)
      const active = await activeInfo(page)
      expect(active.role).not.toBe('radio')
      expect(active.isAccordionHeader).toBe(true)

      await page.close()
    },
    TEST_TIMEOUT_MS
  )

  test(
    'mobile: once inside the theme radio group, arrows move selection',
    async () => {
      const page = await createPage('/')
      await page.setViewportSize({ width: 390, height: 844 })
      await page.locator('text=Latest RFCs').first().waitFor({ state: 'visible' })

      await page.getByRole('button', { name: 'Menu' }).click()
      const preferencesHeader = page.getByRole('button', { name: 'Your preferences' })
      await preferencesHeader.waitFor({ state: 'visible' })
      await preferencesHeader.click()

      const radios = page.getByRole('radio')
      await radios.first().waitFor({ state: 'visible' })

      const initial = await checkedStates(page)
      const startIndex = initial.indexOf('true')
      expect(startIndex).toBeGreaterThanOrEqual(0)
      await radios.nth(startIndex).focus()

      await page.keyboard.press('ArrowDown')
      await page.waitForTimeout(50)
      const afterDown = await checkedStates(page)
      expect(afterDown[(startIndex + 1) % 3]).toBe('true')
      expect(afterDown.filter((s) => s === 'true')).toHaveLength(1)

      await page.close()
    },
    TEST_TIMEOUT_MS
  )
})
