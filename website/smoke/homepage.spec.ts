// The homepage renders and hydrates cleanly.

import { expect, test } from './fixtures'

test('homepage renders its primary content', async ({ page }) => {
  await page.goto('/')

  expect(await page.title()).toBeTruthy()

  // Same signal as e2e/homepage.e2e.ts: the heading is rendered by app/pages/index.vue once the
  // page has its data, so it standing in for "the homepage actually works" is deliberate.
  await expect(page.getByRole('heading', { name: 'Latest RFCs' })).toBeVisible()
})

test('homepage hydrates without page errors', async ({ page, pageIssues }) => {
  await page.goto('/', { waitUntil: 'networkidle' })
  await expect(page.getByRole('heading', { name: 'Latest RFCs' })).toBeVisible()

  // Vue records the mounted app on its container element, so this asserts the client actually
  // hydrated rather than the page merely being server-rendered. A bundle that fails to load or
  // throws during mount leaves the markup looking fine but the app dead.
  const isHydrated = await page.evaluate(() => {
    const container = document.querySelector('#__nuxt')
    return container !== null && '__vue_app__' in container
  })
  expect(isHydrated).toBe(true)

  // Hydration mismatches and client-side exceptions surface here rather than in the markup.
  expect(pageIssues, pageIssues.join('\n')).toEqual([])
})
