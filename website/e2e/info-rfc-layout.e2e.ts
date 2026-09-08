// Layout screenshots of RFC documents chosen for the structures that have broken narrow-screen
// layout before: definition lists in their several forms, long titles, wide URLs and identifiers.
// Each is captured at a desktop and a narrow viewport on first load, with no interaction, so a
// change in how the stylesheet or the precomputer lays a document out shows up as a diff here
// rather than in production. The full curated set, with a note per document, is in
// scripts/rfc-samples.json; this is the half of it that covers each structure once.
import { describe, test } from 'vitest'
import { createPage } from '@nuxt/test-utils/e2e'
import { expectScreenshotToMatchBaseline } from './utilities/screenshot'
import { setupNuxtServer } from './utilities/setup'
import { infoSeriesPathBuilder } from '../app/utilities/url'

const RFCS = [
  'rfc8900', // dlParallel terms beside their definitions
  'rfc8975', // worst definition-list overflow before the inline change
  'rfc9000', // most word breaks, terminology lists, Note asides, 92 references
  'rfc9110', // 576-entry index, largest dl corpus, hyphenated names in narrow cells
  'rfc9325', // longest document title
  'rfc9370', // ordered list expressed as a dl, multi-paragraph definitions
  'rfc9505', // widest unbroken URLs in the references
  'rfc9525', // dotted DNS names on the length gate
  'rfc9559', // backslash paths and camelCase identifiers in table cells
  'rfc9690' // dlNewline whose definitions hold pre blocks and nested lists
]

// The WCAG reflow width and a common desktop width, so both layouts are covered.
const VIEWPORTS = [
  { name: '320', width: 320, height: 720 },
  { name: '1280', width: 1280, height: 720 }
]

// A load, a settle and one full-page capture; generous because the pages run concurrently
// against a single dev server.
const TEST_DURATION_MS = 60_000

describe('info/rfcN layout', async () => {
  await setupNuxtServer()

  for (const rfc of RFCS) {
    for (const viewport of VIEWPORTS) {
      test.concurrent(
        `${rfc} at ${viewport.name}px`,
        async () => {
          const page = await createPage(infoSeriesPathBuilder(rfc))
          await page.setViewportSize({ width: viewport.width, height: viewport.height })
          await page.locator('.rfc-content').first().waitFor({ state: 'visible' })
          await expectScreenshotToMatchBaseline(page, `layout-${rfc}-${viewport.name}`)
          await page.close()
        },
        TEST_DURATION_MS
      )
    }
  }
})
