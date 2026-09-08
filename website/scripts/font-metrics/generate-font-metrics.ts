/**
 * Measures per-character advance widths, in em, for the fonts RFC content renders in, and commits
 * them for the precomputer to use.
 *
 * One table per text style, measured from real elements on a real page so the font stack resolves
 * as it does for a reader. See the README in this directory.
 */
import fs from 'node:fs'
import path from 'node:path'
import { chromium, type Browser } from 'playwright'
import { selectRfcs } from '../rfc-samples.ts'

const DEFAULT_ORIGIN = 'https://www.rfc-editor.org'

const origin = process.argv.find((arg) => arg.startsWith('--origin='))?.split('=')[1] ?? DEFAULT_ORIGIN

/**
 * The text styles RFC content renders in. Each is found on a real page, so its computed font stack,
 * weight and style are whatever a reader gets rather than whatever we think we specified.
 */
const STYLE_CONTEXTS: Record<string, string> = {
  body: '.rfc-content p',
  bold: '.rfc-content strong, .rfc-content .references dt, .rfc-content th',
  monospace: '.rfc-content code, .rfc-content tt'
}

/**
 * Italic is deliberately absent. Measured, its advances came out identical to bold — the selector
 * that found it matched an `em` inside a `strong`, and the face's obliquing does not change advance
 * widths. Consumers use the bold table for italic and bold-italic, which over-estimates slightly for
 * regular italic: the safe direction, and one fewer table to keep in sync.
 */
export const ITALIC_USES_BOLD_TABLE = true

/** Printable ASCII, always measured so the table is never missing a common character. */
const ASCII = Array.from({ length: 0x7e - 0x20 + 1 }, (_, index) => String.fromCharCode(0x20 + index)).join('')

const outputPath = path.resolve(
  import.meta.dirname,
  '..',
  '..',
  '..',
  'precomputer',
  'src',
  'utilities',
  'font-metrics.json'
)

type StyleMetrics = {
  fontFamily: string
  fontWeight: string
  fontStyle: string
  /** Advance width per character, in em. */
  advanceEm: Record<string, number>
  /** Used for characters absent from the table; the mean of the measured set. */
  fallbackAdvanceEm: number
}

const measureInPage = ({ selector, characters }: { selector: string; characters: string }) => {
  const element = document.querySelector(selector)
  if (!element) {
    return null
  }

  const styles = getComputedStyle(element)
  const fontSizePx = parseFloat(styles.fontSize)

  // The ruler is appended inside the element so it inherits the real font, and `white-space: pre`
  // keeps a measured space from collapsing to nothing.
  const ruler = document.createElement('span')
  ruler.style.cssText = 'position:absolute;left:-99999px;top:0;white-space:pre;visibility:hidden'
  element.append(ruler)

  const advanceEm: Record<string, number> = {}
  Array.from(characters).forEach((character) => {
    ruler.textContent = character
    advanceEm[character] = Math.round((ruler.getBoundingClientRect().width / fontSizePx) * 10000) / 10000
  })

  ruler.remove()

  const measured = Object.values(advanceEm)
  return {
    fontFamily: styles.fontFamily,
    fontWeight: styles.fontWeight,
    fontStyle: styles.fontStyle,
    advanceEm,
    fallbackAdvanceEm:
      Math.round((measured.reduce((total, value) => total + value, 0) / Math.max(1, measured.length)) * 10000) / 10000
  }
}

/** Every character the sampled documents actually use, so the table is complete for real content. */
const collectCharacters = () => {
  const content = document.querySelector('.rfc-content')
  if (!content) {
    return ''
  }
  const used = new Set<string>()
  const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT)
  let node = walker.nextNode()
  while (node) {
    Array.from(node.textContent ?? '').forEach((character) => used.add(character))
    node = walker.nextNode()
  }
  return [...used].join('')
}

const main = async () => {
  const { rfcs, selection } = await selectRfcs()
  console.log(`[generate-font-metrics] origin=${origin}, ${selection}`)

  let browser: Browser | undefined
  const styles: Record<string, StyleMetrics> = {}
  const missingContexts: string[] = []
  let characters = ASCII

  try {
    browser = await chromium.launch()
    const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage()

    // First pass: which characters appear in real documents.
    for (const rfc of rfcs) {
      await page.goto(`${origin}/info/rfc${rfc}/`, { waitUntil: 'networkidle', timeout: 120_000 })
      const used = await page.evaluate(collectCharacters)
      characters = [...new Set(Array.from(characters + used))]
        .filter((character) => character.trim().length > 0 || character === ' ')
        .join('')
    }
    console.log(`[generate-font-metrics] ${characters.length} distinct characters to measure`)

    // Second pass: measure each style. A document that lacks one of the contexts is skipped for it,
    // so the loop continues until every context has been found somewhere.
    for (const rfc of rfcs) {
      if (Object.keys(styles).length === Object.keys(STYLE_CONTEXTS).length) {
        break
      }
      await page.goto(`${origin}/info/rfc${rfc}/`, { waitUntil: 'networkidle', timeout: 120_000 })
      for (const [name, selector] of Object.entries(STYLE_CONTEXTS)) {
        if (styles[name]) {
          continue
        }
        const measured = await page.evaluate(measureInPage, { selector, characters })
        if (measured) {
          styles[name] = measured
          console.log(`[generate-font-metrics] ${name}: ${measured.fontFamily} ${measured.fontWeight}`)
        }
      }
    }
  } finally {
    await browser?.close()
  }

  Object.keys(STYLE_CONTEXTS).forEach((name) => {
    if (!styles[name]) {
      missingContexts.push(name)
    }
  })
  if (missingContexts.length > 0) {
    throw Error(`No element matched these contexts in any sampled document: ${missingContexts.join(', ')}`)
  }

  const output = {
    $comment: [
      'Generated by website/scripts/font-metrics/generate-font-metrics.ts. Do not edit by hand.',
      '',
      'Advance widths in em for the fonts RFC content renders in, so the precomputer can decide',
      'width questions — where to break a word, whether a citation fits on one line — without a',
      'browser. Regenerate when the font stack changes; e2e/font-metrics.e2e.ts fails if this drifts',
      'from what a browser measures.',
      '',
      'Summing advances ignores kerning and ligatures, which only ever narrow text, so a sum runs',
      'slightly wide: the safe direction. It cannot account for a reader substituting a different',
      'face, so consumers still need a safety margin.'
    ],
    generatedAt: new Date().toISOString(),
    origin,
    styles
  }

  fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`)
  console.log(`[generate-font-metrics] wrote ${outputPath}`)
}

await main()
