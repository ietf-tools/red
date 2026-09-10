// Layout screenshots of RFC documents chosen for the structures that have broken narrow-screen
// layout before: definition lists in their several forms, long titles, wide URLs and identifiers.
// Each is captured at a desktop and a narrow viewport on first load, with no interaction, so a
// change in how the stylesheet or the precomputer lays a document out shows up as a diff here
// rather than in production. The full curated set, with a note per document, is in
// scripts/rfc-samples.json; this is the half of it that covers each structure once.
import { describe, test } from 'vitest'
import { expectScreenshotToMatchBaseline } from './utilities/screenshot'
import { setupConcurrentPages } from './utilities/setup'
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
  'rfc9690', // dlNewline whose definitions hold pre blocks and nested lists
  'rfc9940' // datatracker draft URLs 85 characters long, shown as their own link text
]

// The WCAG reflow width and a common desktop width, so both layouts are covered.
const VIEWPORTS = [
  { name: '320', width: 320, height: 720 },
  { name: '1280', width: 1280, height: 720 }
]

// A load, a settle and one full-page capture, and on a mismatch the encoding of a full-page diff
// PNG, which for the largest documents is a gigabyte of pixels on the one thread every test here
// shares. Generous because the pages run concurrently against a single dev server, and because
// several mismatches at once serialise their encodes behind each other.
const TEST_DURATION_MS = 180_000

describe('info/rfcN layout', () => {
  const openPage = setupConcurrentPages()

  for (const rfc of RFCS) {
    for (const viewport of VIEWPORTS) {
      test.concurrent(
        `${rfc} at ${viewport.name}px`,
        async () => {
          const page = await openPage(infoSeriesPathBuilder(rfc))
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
