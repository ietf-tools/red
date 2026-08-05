// An RFC info page renders its metadata, abstract, table of contents and document body.
//
// rfc9000 (QUIC) is the fixture: long-lived, Standards Track, and structurally rich enough that
// a regression in any of the main regions shows up here.

import { expect, test } from './fixtures'
import { infoPath } from './fixtures'

const RFC = 'rfc9000'
const RFC_TITLE = 'QUIC: A UDP-Based Multiplexed and Secure Transport'

test.beforeEach(async ({ page }) => {
  await page.goto(infoPath(RFC))
})

test('renders the RFC title', async ({ page }) => {
  await expect(page.getByRole('heading', { level: 1 })).toContainText(RFC_TITLE)
  expect(await page.title()).toContain(RFC_TITLE)
})

test('renders the document metadata', async ({ page }) => {
  // The metadata block comes from the API rather than the precomputed document HTML, so it fails
  // independently of the body and is worth asserting separately.
  await expect(page.getByText('Stream:').first()).toBeVisible()
  await expect(page.getByText('Status:').first()).toBeVisible()
  await expect(page.getByText('Standards Track').first()).toBeVisible()
  await expect(page.getByText('J. Iyengar')).toBeVisible()
  await expect(page.getByText('Internet Engineering Task Force (IETF)')).toBeVisible()
})

test('renders the abstract and the precomputed document body', async ({ page }) => {
  await expect(page.locator('#abstract')).toBeVisible()

  // .rfc-content-type-xml2rfc is applied by RFCDocumentBody.vue when the precomputed HTML has
  // loaded, so its absence means the document body never arrived.
  await expect(page.locator('.rfc-content.rfc-content-type-xml2rfc')).toBeVisible()
})

test('renders the table of contents', async ({ page }) => {
  const toc = page.getByRole('navigation', { name: 'In this RFC (desktop menu)' })
  await expect(toc).toBeVisible()
  await expect(toc.getByRole('link').first()).toBeVisible()
})
