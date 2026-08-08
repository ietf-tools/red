import { describe, expect, test } from 'vitest'
import { createPage, url } from '@nuxt/test-utils/e2e'
import { setupNuxtServer } from '../../../../e2e/utilities/setup'

const TEST_DURATION_MS = 60_000

describe('RfcEditorSearch (searchv2)', async () => {
  await setupNuxtServer()

  test(
    'renders the accessible v2 search and loads results',
    async () => {
      const page = await createPage('/search/')
      // Enable the searchV2 feature flag, then reload so app.vue picks it up on mount.
      await page.evaluate(() =>
        window.localStorage.setItem('feature-flag-experiments', JSON.stringify({ searchV2: true }))
      )
      await page.goto(url('/search/?q=http'))

      // v2 renders (heading marker).
      await page.locator('h1', { hasText: 'Search' }).waitFor({ state: 'visible' })

      // Defect 2: submit button is named via aria-label, not title.
      const submit = page.locator('button[aria-label="Submit search"]')
      await submit.waitFor({ state: 'visible' })
      expect(await submit.getAttribute('title')).toBeNull()

      // Exactly one search landmark (the host's enclosing region); SearchBox no longer duplicates it
      expect(await page.locator('[role="search"][aria-label="RFC search"]').count()).toBe(1)
      expect(await page.locator('form[role="search"]').count()).toBe(0)

      // Defect 1: the result count is in a polite live region (distinct from Nuxt's
      // route announcer, which is also role=status/aria-live=polite).
      const stats = page.locator('[aria-live="polite"]').filter({ hasText: 'results' })
      await stats.first().waitFor({ state: 'visible', timeout: 20_000 })

      // Results actually load from Typesense into the hits container.
      const resultItems = page.locator('#searchv2-hits-container li')
      await expect.poll(async () => resultItems.count(), { timeout: 20_000 }).toBeGreaterThan(0)

      await page.close()
    },
    TEST_DURATION_MS
  )

  test(
    'mobile: sort is available and the filter dialog is accessible',
    async () => {
      const page = await createPage('/search/')
      await page.setViewportSize({ width: 390, height: 800 })
      await page.evaluate(() =>
        window.localStorage.setItem('feature-flag-experiments', JSON.stringify({ searchV2: true }))
      )
      await page.goto(url('/search/?q=http'))
      await page.locator('h1', { hasText: 'Search' }).waitFor({ state: 'visible' })

      // H1: trigger is a single button with aria-haspopup="dialog" and no aria-expanded
      const filterButton = page.locator('button', { hasText: 'Filter RFCs' })
      await filterButton.waitFor({ state: 'visible' })
      expect(await filterButton.getAttribute('aria-haspopup')).toBe('dialog')
      expect(await filterButton.getAttribute('aria-expanded')).toBeNull()

      // E1: a sort control is reachable on mobile
      const sortControls = page.getByLabel('Sort by')
      const sortCount = await sortControls.count()
      let sortVisible = false
      for (let index = 0; index < sortCount; index += 1) {
        if (await sortControls.nth(index).isVisible()) sortVisible = true
      }
      expect(sortVisible).toBe(true)

      // F1: density control is a labelled radio group of mutually-exclusive options
      expect(await page.getByRole('group', { name: 'Display results as' }).count()).toBeGreaterThan(0)
      expect(await page.getByRole('radio').count()).toBeGreaterThanOrEqual(3)

      // Open the dialog
      await filterButton.click()
      const dialog = page.locator('dialog[open]')
      await dialog.waitFor({ state: 'visible' })

      // H2: dialog labelled by an <h1> containing only the heading text, with a close button outside it
      expect(await dialog.getAttribute('aria-labelledby')).toBe('rfc-filter-dialog-title')
      expect(await dialog.locator('h1#rfc-filter-dialog-title').textContent()).toContain('Filter RFCs')
      await dialog.locator('button[aria-label="Close filters"]').waitFor({ state: 'visible' })

      // H3: closing returns focus to the trigger (native <dialog> behaviour)
      await dialog.locator('button[aria-label="Close filters"]').click()
      await expect.poll(async () => page.locator('dialog[open]').count()).toBe(0)
      expect(await page.evaluate(() => document.activeElement?.textContent?.includes('Filter RFCs') ?? false)).toBe(
        true
      )

      await page.close()
    },
    TEST_DURATION_MS
  )

  test(
    'facet checkbox: focus stays on the toggled option after the list updates',
    async () => {
      const page = await createPage('/search/')
      await page.evaluate(() =>
        window.localStorage.setItem('feature-flag-experiments', JSON.stringify({ searchV2: true }))
      )
      await page.goto(url('/search/?q=http'))

      const firstCheckbox = page.locator('fieldset input[type="checkbox"]').first()
      await firstCheckbox.waitFor({ state: 'visible', timeout: 25_000 })
      const toggledValue = await firstCheckbox.getAttribute('value')

      await firstCheckbox.focus()
      await page.keyboard.press('Space')
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(600)

      // After the search reruns and the facet list updates, keyboard focus must not be
      // lost to <body>; it stays on (or is restored to) a checkbox in the group.
      const focused = await page.evaluate(() => {
        const el = document.activeElement as HTMLInputElement | null
        return { type: el?.getAttribute('type') ?? null, value: el?.getAttribute('value') ?? null }
      })
      expect(focused.type).toBe('checkbox')
      expect(focused.value).toBe(toggledValue)

      await page.close()
    },
    TEST_DURATION_MS
  )
})
