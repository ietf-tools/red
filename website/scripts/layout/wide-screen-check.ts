/**
 * Checks that the narrow-screen rules changed nothing above their threshold, by comparing prod
 * against the dev server: prod serves the previous CSS, dev the new one, and both read the same
 * published documents, so any difference at a wide viewport is caused by the CSS.
 *
 * That equivalence ends at the next republish, when precomputed markup starts differing too.
 *
 * See the README in this directory.
 */
import { chromium, type Page } from 'playwright'
import { selectRfcs } from '../rfc-samples.ts'

const DEV_ORIGIN = 'http://localhost:3000'
const PROD_ORIGIN = 'https://www.rfc-editor.org'

/** Both sides of the narrowest threshold in the stylesheet, so neither is measured by accident. */
const WIDE_VIEWPORTS = [1024, 1280]

/** Selectors the narrow-screen rules touch, plus paragraphs as a control none of them mention. */
const WATCHED: Record<string, string> = {
  'references dt': '.rfc-content .references dt',
  'references dd': '.rfc-content .references dd',
  'definition dt': '.rfc-content dl:not(.references) > dt',
  'definition dd': '.rfc-content dl:not(.references) > dd',
  aside: '.rfc-content aside',
  blockquote: '.rfc-content blockquote',
  paragraph: '.rfc-content p'
}

const PROPERTIES = ['display', 'float', 'margin-left', 'padding-left', 'padding-right', 'width']

/** Runs in the page: computed-style tallies plus the overflow a reader would see. */
const collectSignature = ({ watched, properties }: { watched: Record<string, string>; properties: string[] }) => {
  const root = document.documentElement
  const content = document.querySelector('.rfc-content')

  const styles: Record<string, Record<string, number>> = {}
  for (const [name, selector] of Object.entries(watched)) {
    const tally: Record<string, number> = {}
    for (const element of Array.from(document.querySelectorAll(selector))) {
      const computed = getComputedStyle(element)
      const key = properties.map((property) => `${property}=${computed.getPropertyValue(property)}`).join(' ')
      tally[key] = (tally[key] ?? 0) + 1
    }
    styles[name] = tally
  }

  // A scrolling element is meant to be wider than its container, so it is not overflow.
  const columnRight = content?.getBoundingClientRect().right ?? root.clientWidth
  const pastColumn = content
    ? Array.from(content.querySelectorAll('*')).filter((element) => {
        const { overflowX } = getComputedStyle(element)
        if (['auto', 'scroll', 'hidden', 'clip'].includes(overflowX)) {
          return false
        }
        return element.getBoundingClientRect().right > columnRight + 1
      }).length
    : 0

  return {
    styles,
    pastColumn,
    pageExcess: root.scrollWidth - root.clientWidth,
    columnWidth: Math.round(content?.getBoundingClientRect().width ?? 0)
  }
}

type Signature = ReturnType<typeof collectSignature>

const capture = async (page: Page, url: string): Promise<Signature> => {
  await page.goto(url, { waitUntil: 'networkidle', timeout: 120_000 })
  // The FontFaceSet cannot cross the page boundary, so only the wait is observed here.
  await page.evaluate(() => document.fonts.ready.then(() => undefined))
  return page.evaluate(collectSignature, { watched: WATCHED, properties: PROPERTIES })
}

const tallyDifferences = (before: Record<string, number>, after: Record<string, number>): string[] =>
  [...new Set([...Object.keys(before), ...Object.keys(after)])].flatMap((key) => {
    const from = before[key] ?? 0
    const to = after[key] ?? 0
    return from === to ? [] : [`${from}→${to} × ${key}`]
  })

const describeDifferences = (before: Signature, after: Signature): string[] => {
  const notes: string[] = []
  if (before.columnWidth !== after.columnWidth) {
    notes.push(`content column ${before.columnWidth}px → ${after.columnWidth}px`)
  }
  if (before.pastColumn !== after.pastColumn) {
    notes.push(`elements past the column ${before.pastColumn} → ${after.pastColumn}`)
  }
  if (before.pageExcess !== after.pageExcess) {
    notes.push(`page overflow ${before.pageExcess}px → ${after.pageExcess}px`)
  }
  for (const name of Object.keys(WATCHED)) {
    const changes = tallyDifferences(before.styles[name] ?? {}, after.styles[name] ?? {})
    if (changes.length > 0) {
      notes.push(`${name}: ${changes.join('; ')}`)
    }
  }
  return notes
}

const main = async () => {
  const { rfcs, selection } = await selectRfcs()
  console.log(`[wide-screen-check] ${selection}, viewports ${WIDE_VIEWPORTS.join('/')}px`)
  console.log(`[wide-screen-check] before=${PROD_ORIGIN} after=${DEV_ORIGIN}`)

  const browser = await chromium.launch()
  let differing = 0

  try {
    for (const width of WIDE_VIEWPORTS) {
      const context = await browser.newContext({ viewport: { width, height: 900 } })
      const page = await context.newPage()
      console.log(`\n=== ${width}px ===`)

      for (const rfc of rfcs) {
        try {
          const before = await capture(page, `${PROD_ORIGIN}/info/rfc${rfc}/`)
          const after = await capture(page, `${DEV_ORIGIN}/info/rfc${rfc}/`)
          const notes = describeDifferences(before, after)
          if (notes.length === 0) {
            console.log(`rfc${rfc}: identical`)
          } else {
            differing += 1
            console.log(`rfc${rfc}: DIFFERS`)
            notes.forEach((note) => console.log(`   ${note}`))
          }
        } catch (error) {
          console.log(`rfc${rfc}: ERROR ${error instanceof Error ? error.message.split('\n')[0] : String(error)}`)
        }
      }

      await context.close()
    }
  } finally {
    await browser.close()
  }

  console.log(`\n[wide-screen-check] documents with wide-layout differences: ${differing}`)
}

await main()
