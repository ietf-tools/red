// Search works end to end against the target environment's Typesense index.
//
// Complements e2e/search-index/, which measures *ranking quality* by calling Typesense directly.
// This is the other half: that the deployed app can reach its index and render hits at all.

import { expect, test } from './fixtures.ts'

const SEARCH_PATH = '/search'
const HITS_CONTAINER = '#ais-hits-container'

test('typing a query renders results', async ({ page }) => {
  await page.goto(SEARCH_PATH)

  const search = page.getByRole('search', { name: 'RFC search' })
  await expect(search).toBeVisible()

  // Search is client-side (the browser talks to Typesense directly), so the results only exist
  // after hydration — hence driving the real input rather than loading `?q=` and reading the HTML.
  await search.getByRole('searchbox').first().fill('quic')

  const hits = page.locator(`${HITS_CONTAINER} li`)
  await expect(hits.first()).toBeVisible()
  expect(await hits.count()).toBeGreaterThan(0)

  await expect(page.locator(HITS_CONTAINER)).toContainText('QUIC')
})

test('a query with no matches renders the empty state rather than failing', async ({ page }) => {
  await page.goto(SEARCH_PATH)

  const search = page.getByRole('search', { name: 'RFC search' })
  await search.getByRole('searchbox').first().fill('zzzznotanrfczzzz')

  await expect(page.getByText('No RFCs match your search query and active filters.')).toBeVisible()
})
