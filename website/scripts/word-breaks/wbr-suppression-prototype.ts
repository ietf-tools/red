/**
 * Prototype for suppressing unnecessary word breaks, entirely in the browser.
 *
 * The idea: a `<wbr>` only earns
 * its place when its word might not fit. If the precomputer labelled each break with how wide its
 * word is, CSS could hide the ones that cannot be needed — so `CONNECTION_CLOSE` renders unbroken in
 * a paragraph at default text, and still wraps at 200% where it genuinely does not fit.
 *
 * CSS cannot compare numbers, so the width is quantised into word size groupings: one rule per grouping, hiding
 * its breaks once the container is at least as wide as the grouping's ceiling. The container is queried
 * rather than the viewport, so the decision accounts for indentation, table cells and nesting — the
 * things that repeatedly turned out to matter more than viewport width.
 *
 * This does in JavaScript what the precomputer would do at build time: measure each word, label its
 * breaks, and install the rules. That makes the idea measurable — suppression rate, safety,
 * and layout cost — without republishing the corpus.
 *
 * Document selection comes from rfc-samples.ts, shared by every script here:
 *
 *   (no flags)                 the curated complex-layout set
 *   --from=9700 --to=9900      a range, e.g. RFCs published since this was last run
 *   --rfcs=9000,9110           specific documents
 *
 * Add --origin=http://localhost:3000 to measure unreleased rules.
 */
import fs from 'node:fs'
import path from 'node:path'
import { chromium, type Browser, type Page } from 'playwright'
import { noteForRfc, selectRfcs } from '../rfc-samples.ts'

const DEFAULT_ORIGIN = 'https://www.rfc-editor.org'

const origin = process.argv.find((arg) => arg.startsWith('--origin='))?.split('=')[1] ?? DEFAULT_ORIGIN

const VIEWPORT_WIDTH = 320

const ROOT_FONT_SIZES_PX = [16, 32]

/**
 * Word size groupings, in em. A word is labelled with the first grouping it fits inside, and its breaks
 * are hidden only where the whole grouping fits — so the grouping's ceiling, not the measured width, is
 * what has to fit, and suppression can never cause an overflow.
 */
const WORD_SIZE_GROUPINGS_EM = [4, 6, 8, 10, 12, 16, 24]

/**
 * Absorbs the error in summing per-character advances rather than measuring the whole word. Kerning
 * and ligatures narrow text, so the sum usually runs wide, but subpixel advance rounding can make it
 * run short — measured worst case is 3.9% across the sample. Kept separate from SAFETY_FACTOR so
 * tightening one does not silently weaken the other.
 */
const ESTIMATE_ERROR_FACTOR = 1.05

/**
 * The site's text-scale setting adds letter and word spacing at runtime, which a build-time width
 * table cannot know about. These are applied *after* labelling, to measure how stale the labels
 * become — i.e. whether suppression has to be disabled for those readers.
 *
 * DEFAULT_TEXT_SCALE is 1.5, whose values (0.12em letter, 0.16em word, 1.5 line height) are exactly
 * the WCAG 2.2 SC 1.4.12 Text Spacing test values, so a reader on defaults is already spaced.
 */
const TEXT_SCALE_SPACING_CSS: Record<string, string> = {
  'scale 1.5 (default)': '.rfc-content { letter-spacing: 0.12em !important; word-spacing: 0.16em !important }',
  'scale 2 (maximum)': '.rfc-content { letter-spacing: 0.5em !important; word-spacing: 1em !important }'
}

/**
 * Headroom required before a word's breaks are hidden. Measured widths assume our font stack
 * resolves; a reader whose browser substitutes a wider face, or who adds letter spacing, needs the
 * word to have been given room to spare.
 */
const SAFETY_FACTOR = 1.2

const outputDir = path.resolve(import.meta.dirname, '..', '..', '..', 'docs', 'mobile-layout', 'data')

type PrototypeResult = {
  rfc: number
  rootFontSizePx: number
  containersCreated: number
  wordsMeasured: number
  wordsSuppressed: number
  breaksTotal: number
  breaksSuppressed: number
  pageOverflowBeforePx: number
  pageOverflowAfterPx: number
  overflowingElementsBefore: number
  overflowingElementsAfter: number
  overflowingElementsAfterSpacing: Record<string, number>
  measureMs: number
  applyMs: number
  estimateMs: number
  charTables: number
  charsMeasured: number
  worstOverestimate: number
  worstUnderestimate: number
  underestimatedWords: number
}

const runPrototype = ({
  groupingsEm,
  safetyFactor,
  estimateErrorFactor,
  spacingScenarios
}: {
  groupingsEm: number[]
  safetyFactor: number
  estimateErrorFactor: number
  spacingScenarios: Record<string, string>
}) => {
  const content = document.querySelector('.rfc-content')
  if (!content) {
    throw Error('No .rfc-content')
  }

  const overflowingElementCount = () =>
    Array.from(content.querySelectorAll('*')).filter((el) => el.scrollWidth > el.clientWidth + 1).length

  const pageOverflow = () => Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth)

  const pageOverflowBeforePx = pageOverflow()
  const overflowingElementsBefore = overflowingElementCount()

  // The query container must be a block: an inline box cannot be a size container, and definitions
  // are inline on narrow screens.
  const blockAncestorOf = (node: Element): Element => {
    let el: Element | null = node
    while (el && el !== content) {
      const { display } = getComputedStyle(el)
      if (display !== 'inline' && display !== 'inline-block') {
        return el
      }
      el = el.parentElement
    }
    return content
  }

  /** Reconstructs the word around each `<wbr>`, since inserting one splits the text node. */
  const wordsOf = (parent: Element): { text: string; breaks: Element[] }[] => {
    let text = ''
    let breaks: Element[] = []
    const words: { text: string; breaks: Element[] }[] = []
    const flush = () => {
      if (text.length > 0 && breaks.length > 0) {
        words.push({ text, breaks })
      }
      text = ''
      breaks = []
    }
    Array.from(parent.childNodes).forEach((node) => {
      if (node.nodeName.toLowerCase() === 'wbr') {
        breaks.push(node as Element)
        return
      }
      if (node.nodeType !== Node.TEXT_NODE) {
        flush()
        return
      }
      ;(node.textContent ?? '').split(/(\s+)/).forEach((part) => {
        if (/^\s+$/.test(part)) {
          flush()
          return
        }
        text += part
      })
    })
    flush()
    return words
  }

  const ruler = document.createElement('span')
  ruler.style.cssText = 'position:absolute;left:-99999px;top:0;white-space:pre;visibility:hidden'

  const containers = new Set<Element>()
  const charTables = new Map<string, Map<string, number>>()
  let wordsMeasured = 0
  let breaksTotal = 0
  let charsMeasured = 0
  let exactMs = 0
  let estimateMs = 0
  let worstOverestimate = 0
  let worstUnderestimate = Number.POSITIVE_INFINITY
  let underestimatedWords = 0

  const parents = new Set(Array.from(content.querySelectorAll('wbr'), (wbr) => wbr.parentElement).filter(Boolean))

  parents.forEach((parent) => {
    if (!parent) {
      return
    }
    const container = blockAncestorOf(parent)
    containers.add(container)

    // Width is expressed relative to the container's font size, because that is what `em` resolves
    // against inside a container query. Measuring against the word's own font size would make the
    // two sides incomparable wherever `code` or a heading changes it.
    const containerFontSizePx = parseFloat(getComputedStyle(container).fontSize)

    parent.append(ruler)

    // One advance-width table per distinct text style, built on first use. Summing per-character
    // advances ignores kerning and ligatures, both of which normally *narrow* text, so the sum runs
    // slightly wide — the safe direction, since a word is only unbroken when its estimate fits.
    const signature = (() => {
      const parentStyles = getComputedStyle(parent)
      return [
        parentStyles.fontFamily,
        parentStyles.fontSize,
        parentStyles.fontWeight,
        parentStyles.fontStyle,
        parentStyles.letterSpacing,
        parentStyles.fontFeatureSettings
      ].join('|')
    })()

    let table = charTables.get(signature)
    if (!table) {
      table = new Map<string, number>()
      charTables.set(signature, table)
    }

    const advanceOf = (character: string): number => {
      const cached = table.get(character)
      if (cached !== undefined) {
        return cached
      }
      ruler.textContent = character
      const advance = ruler.getBoundingClientRect().width
      table.set(character, advance)
      charsMeasured += 1
      return advance
    }

    wordsOf(parent).forEach(({ text, breaks }) => {
      const exactStart = performance.now()
      ruler.textContent = text
      const exactPx = ruler.getBoundingClientRect().width
      exactMs += performance.now() - exactStart

      const estimateStart = performance.now()
      const estimatePx = Array.from(text).reduce((total, character) => total + advanceOf(character), 0)
      estimateMs += performance.now() - estimateStart

      if (exactPx > 0) {
        const ratio = estimatePx / exactPx
        worstOverestimate = Math.max(worstOverestimate, ratio)
        worstUnderestimate = Math.min(worstUnderestimate, ratio)
        if (ratio < 1) {
          underestimatedWords += 1
        }
      }

      // Grouped from the estimate, which is what a build-time implementation would have.
      const widthEm = (estimatePx * estimateErrorFactor) / containerFontSizePx
      const grouping = groupingsEm.find((candidate) => widthEm <= candidate)
      wordsMeasured += 1
      breaksTotal += breaks.length
      breaks.forEach((wbr) => {
        // No grouping means wider than the largest: it always keeps its breaks.
        wbr.classList.add(grouping === undefined ? 'wordsize-wide' : `wordsize-${grouping}`)
      })
    })
    ruler.remove()
  })

  const applyStart = performance.now()

  const style = document.createElement('style')
  style.id = 'wbr-suppression-prototype'
  // One rule per grouping, not a matrix: a word whose grouping's ceiling is no wider than its container
  // provably fits, so `container >= grouping` is the whole test. Banded rules would leave gaps
  // between the bands where nothing matches.
  style.textContent = [
    // Only block containers, so inline definitions are not asked to be size containers.
    `.rfc-content :is(p, dd, dt, li, td, th, blockquote, figcaption) { container-type: inline-size }`,
    ...groupingsEm.map(
      (groupingEm) =>
        `@container (min-width: ${(groupingEm * safetyFactor).toFixed(2)}em) { .rfc-content wbr.wordsize-${groupingEm} { display: none } }`
    )
  ].join('\n')
  document.head.append(style)

  void document.documentElement.offsetWidth
  const applyMs = performance.now() - applyStart

  const breaksSuppressed = Array.from(content.querySelectorAll('wbr')).filter(
    (wbr) => getComputedStyle(wbr).display === 'none'
  ).length

  // A word counts as suppressed only when every one of its breaks is hidden; a partially suppressed
  // word can still split, so it would not satisfy the complaint in #498.
  let wordsSuppressed = 0
  parents.forEach((parent) => {
    if (!parent) {
      return
    }
    wordsOf(parent).forEach(({ breaks }) => {
      if (breaks.every((wbr) => getComputedStyle(wbr).display === 'none')) {
        wordsSuppressed += 1
      }
    })
  })

  // With labels already fixed, turning on text spacing models a reader who changes the setting
  // after the document was generated: the widths the labels were based on are now wrong.
  const overflowingElementsAfterSpacing: Record<string, number> = {}
  Object.entries(spacingScenarios).forEach(([label, css]) => {
    const spacing = document.createElement('style')
    spacing.textContent = css
    document.head.append(spacing)
    void document.documentElement.offsetWidth
    overflowingElementsAfterSpacing[label] = overflowingElementCount()
    spacing.remove()
  })

  return {
    overflowingElementsAfterSpacing,
    containersCreated: containers.size,
    wordsMeasured,
    wordsSuppressed,
    breaksTotal,
    breaksSuppressed,
    pageOverflowBeforePx,
    pageOverflowAfterPx: pageOverflow(),
    overflowingElementsBefore,
    overflowingElementsAfter: overflowingElementCount(),
    measureMs: Math.round(exactMs),
    applyMs: Math.round(applyMs),
    estimateMs: Math.round(estimateMs),
    charTables: charTables.size,
    charsMeasured,
    worstOverestimate: Math.round(worstOverestimate * 1000) / 1000,
    worstUnderestimate: Math.round(worstUnderestimate * 1000) / 1000,
    underestimatedWords
  }
}

const main = async () => {
  const { rfcs, selection } = await selectRfcs()

  console.log(`[wbr-suppression-prototype] origin=${origin}, ${selection}`)

  let browser: Browser | undefined
  const results: PrototypeResult[] = []

  try {
    browser = await chromium.launch()
    const context = await browser.newContext({ viewport: { width: VIEWPORT_WIDTH, height: 900 } })
    const page: Page = await context.newPage()
    const cdp = await context.newCDPSession(page)

    for (const rfc of rfcs) {
      for (const rootFontSizePx of ROOT_FONT_SIZES_PX) {
        // A browser default font size, not a page-set root size: that is what a reader adjusts, and
        // the only thing em-based queries respond to.
        await cdp.send('Page.setFontSizes', {
          fontSizes: { standard: rootFontSizePx, fixed: rootFontSizePx - 3 }
        })
        await page.goto(`${origin}/info/rfc${rfc}/`, { waitUntil: 'networkidle', timeout: 120_000 })
        const measured = await page.evaluate(runPrototype, {
          groupingsEm: WORD_SIZE_GROUPINGS_EM,
          safetyFactor: SAFETY_FACTOR,
          estimateErrorFactor: ESTIMATE_ERROR_FACTOR,
          spacingScenarios: TEXT_SCALE_SPACING_CSS
        })
        results.push({ rfc, rootFontSizePx, ...measured })
      }
      const note = noteForRfc(rfc)
      console.log(`[wbr-suppression-prototype] rfc${rfc} done${note ? ` — ${note}` : ''}`)
    }
  } finally {
    await browser?.close()
  }

  const table = results.map((result) => ({
    rfc: result.rfc,
    text: `${Math.round((result.rootFontSizePx / 16) * 100)}%`,
    words: result.wordsMeasured,
    'words suppressed': `${result.wordsSuppressed} (${Math.round((result.wordsSuppressed / Math.max(1, result.wordsMeasured)) * 100)}%)`,
    'breaks suppressed': `${result.breaksSuppressed} (${Math.round((result.breaksSuppressed / Math.max(1, result.breaksTotal)) * 100)}%)`,
    'overflow before/after': `${result.pageOverflowBeforePx}px / ${result.pageOverflowAfterPx}px`,
    'overflowing els': `${result.overflowingElementsBefore} / ${result.overflowingElementsAfter}`,
    containers: result.containersCreated,
    'exact/est ms': `${result.measureMs}/${result.estimateMs}`,
    'char tables': `${result.charTables} (${result.charsMeasured} chars)`,
    'est/exact ratio': `${result.worstUnderestimate}–${result.worstOverestimate}`,
    'under-estimated': result.underestimatedWords,
    'els over base/suppressed': `${result.overflowingElementsBefore} / ${result.overflowingElementsAfter}`,
    '+spacing 1.5 / 2': Object.values(result.overflowingElementsAfterSpacing).join(' / ')
  }))

  console.table(table)

  const regressions = results.filter(
    (result) =>
      result.pageOverflowAfterPx > result.pageOverflowBeforePx ||
      result.overflowingElementsAfter > result.overflowingElementsBefore
  )
  console.log(
    regressions.length === 0
      ? '\nNo overflow regression: suppression never made a page or element wider.'
      : `\nOVERFLOW REGRESSION on ${regressions.length} measurements — the grouping rule is unsafe as configured.`
  )

  fs.mkdirSync(outputDir, { recursive: true })
  const outputPath = path.join(outputDir, 'suppression-prototype.json')
  fs.writeFileSync(
    outputPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        origin,
        groupingsEm: WORD_SIZE_GROUPINGS_EM,
        safetyFactor: SAFETY_FACTOR,
        results
      },
      null,
      2
    )
  )
  console.log(`[wbr-suppression-prototype] wrote ${outputPath}`)
}

await main()
