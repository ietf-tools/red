/**
 * Measures whether each `<wbr>` we insert into RFC documents is doing any work.
 *
 * Background: https://github.com/ietf-tools/red/issues/498 asks us to stop inserting `<wbr>`. The insertion rules in
 * precomputer/src/tasks/rfc-html.ts were tuned by eye, so we have no per-token evidence of
 * which insertions actually prevent a mobile overflow and which are inert. This produces that
 * evidence so the discussion can be about data rather than recollection.
 *
 * Method, per RFC and per (viewport width, text scale) cell:
 *  1. record horizontal overflow of the document with `<wbr>` live,
 *  2. suppress every `<wbr>` and record overflow again — the difference is what they buy us,
 *  3. for every token containing a `<wbr>`, measure its unbroken width against the width
 *     actually available in its containing block, which is what decides whether it can overflow.
 *
 * A `<wbr>` is "load-bearing" in a cell when its token cannot fit unbroken there. Suppression is
 * done with `display: none`, which is indistinguishable from removing the nodes (verified in
 * Chromium), so the same page serves both passes without a reload.
 *
 * Usage:
 *   node scripts/word-breaks/wbr-measure.ts --corpus=targeted
 *   node scripts/word-breaks/wbr-measure.ts --corpus=broad --limit=120
 */
import fs from 'node:fs'
import path from 'node:path'
import { chromium, type Browser, type Page } from 'playwright'

const PROD_ORIGIN = 'https://www.rfc-editor.org'

const RFC_CONTENT_SELECTOR = '.rfc-content'

const SUPPRESS_WBR_STYLE_ID = 'wbr-measure-suppress'

/**
 * Mirrors precomputer/src/tasks/rfc-html.ts. Kept as a literal rather than imported because the
 * precomputer is a separate package and this script has to run against published pages, where the
 * only evidence of the rules is their output.
 */
const REQUIRE_WORDBREAK_AFTER_CHARS_LENGTH = 16

/**
 * 320 CSS px is the reflow width WCAG 2.2 SC 1.4.10 is measured at, and is equivalent to a 1280px
 * desktop viewport at 400% zoom. The wider widths establish where any need for `<wbr>` stops.
 */
const VIEWPORT_WIDTHS = [320, 375, 414, 768, 1024, 1280]

const BROAD_VIEWPORT_WIDTHS = [320]

/** Root font sizes in px: default, and the 200% of SC 1.4.4. */
const TEXT_SCALES = [16, 24, 32]

const BROAD_TEXT_SCALES = [16, 32]

/**
 * The two RFCs cited in https://github.com/ietf-tools/red/issues/498 and
 * https://github.com/ietf-tools/red/issues/424, plus a spread of document shapes.
 */
const TARGETED_RFCS = [9000, 9297, 9114, 9110, 8446, 7540, 5234, 3986, 2119, 6749]

/**
 * Only xml2rfc-format documents are eligible: earlier RFCs are published as plain text inside
 * `<pre>`, which the precomputer skips entirely, so they never receive a `<wbr>`. Sampling the
 * whole series would dilute every proportion with documents that could not participate.
 */
const FIRST_XML2RFC_RFC = 8650

const BROAD_SAMPLE_CEILING = 9700

const BROAD_SAMPLE_STRIDE = 9

const outputDir = path.resolve(import.meta.dirname, '..', '..', '..', 'docs', 'mobile-layout', 'data')

type Cell = {
  viewportWidth: number
  rootFontSizePx: number
}

type OverflowSource = {
  tag: string
  id: string
  overflowPx: number
  snippet: string
}

type TokenMeasurement = {
  token: string
  anchorId: string
  intrinsicWidthPx: number
  availableWidthPx: number
  fitsUnbroken: boolean
  wbrCount: number
  containerTag: string
  containerChain: string
  hasUnderscore: boolean
  hasCamelCase: boolean
  exceedsLengthGate: boolean
  looksLikeUrl: boolean
}

type PageMeasurement = {
  contentType: string
  wbrCount: number
  overflowWithWbr: number
  overflowWithoutWbr: number
  overflowingElementsWithWbr: number
  overflowingElementsWithoutWbr: number
  overflowSourcesWithWbr: OverflowSource[]
  overflowSourcesWithoutWbr: OverflowSource[]
  tokens: TokenMeasurement[]
}

type Row = TokenMeasurement & {
  rfc: number
  viewportWidth: number
  rootFontSizePx: number
  url: string
}

/**
 * Runs in the page. Self-contained because it is serialised across the CDP boundary.
 */
const measureInPage = ({
  contentSelector,
  styleId,
  lengthGate
}: {
  contentSelector: string
  styleId: string
  lengthGate: number
}): PageMeasurement => {
  const content = document.querySelector(contentSelector)
  if (!content) {
    throw Error(`No ${contentSelector} on ${window.location.href}`)
  }

  // Artwork and diagrams never receive `<wbr>` (the precomputer skips them) and are deliberately
  // allowed to scroll horizontally, so they are hidden for the whole measurement. Both passes are
  // measured without them, which keeps the with/without comparison about reflowable text only.
  const hideNonWrappingContent = () => {
    const style = document.createElement('style')
    style.textContent = 'pre, svg { display: none !important }'
    document.head.append(style)
    return () => style.remove()
  }

  const setWbrSuppressed = (isSuppressed: boolean) => {
    const existing = document.getElementById(styleId)
    existing?.remove()
    if (!isSuppressed) {
      return
    }
    const style = document.createElement('style')
    style.id = styleId
    style.textContent = 'wbr { display: none !important }'
    document.head.append(style)
  }

  const documentOverflowPx = () =>
    Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth)

  // RFC artwork is preformatted and cannot reflow, so we give it a scroll container on purpose.
  // Counting it as an overflow failure would credit `<wbr>` with fixing something it never touches
  // (the precomputer skips `pre` entirely), so overflow is only attributed to content that was
  // supposed to wrap.
  const isExemptFromWrapping = (el: Element): boolean => {
    let current: Element | null = el
    while (current && current !== document.documentElement) {
      if (current.tagName.toLowerCase() === 'pre' || current.tagName.toLowerCase() === 'svg') {
        return true
      }
      const { overflowX } = getComputedStyle(current)
      if (overflowX === 'auto' || overflowX === 'scroll') {
        return true
      }
      current = current.parentElement
    }
    return false
  }

  // An overflowing element makes every ancestor overflow too, so only the deepest one is the
  // actual culprit worth naming in the report.
  const isDeepestOverflowing = (el: Element): boolean =>
    !Array.from(el.querySelectorAll('*')).some(
      (descendant) => descendant.scrollWidth > descendant.clientWidth + 1 && !isExemptFromWrapping(descendant)
    )

  const overflowSources = () =>
    Array.from(content.querySelectorAll('*'))
      .filter((el) => el.scrollWidth > el.clientWidth + 1 && !isExemptFromWrapping(el) && isDeepestOverflowing(el))
      .map((el) => ({
        tag: el.tagName.toLowerCase(),
        id: el.id,
        overflowPx: el.scrollWidth - el.clientWidth,
        snippet: (el.textContent ?? '').trim().slice(0, 80)
      }))
      .sort((a, b) => b.overflowPx - a.overflowPx)
      .slice(0, 10)

  const reflowableOverflowCount = () =>
    Array.from(content.querySelectorAll('*')).filter(
      (el) => el.scrollWidth > el.clientWidth + 1 && !isExemptFromWrapping(el) && isDeepestOverflowing(el)
    ).length

  // The nearest ancestor that establishes a line box is what a token has to fit inside; an inline
  // ancestor's own width is a consequence of wrapping rather than a constraint on it.
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

  // Paragraph-level ids (`section-2.1-4`) are what RFC readers cite, so each measurement carries
  // the nearest one and the report can link to the exact place a token sits.
  const anchorIdOf = (el: Element): string => {
    let current: Element | null = el
    while (current && current !== document.documentElement) {
      if (current.id) {
        return current.id
      }
      current = current.parentElement
    }
    return ''
  }

  // Indentation is what actually squeezes a token: a `dd` inside a reference list has far less
  // usable width than a top-level `p` at the same viewport. Recording the chain lets the report
  // say which parts of a document are narrow rather than just how narrow the viewport is.
  const containerChainOf = (el: Element): string => {
    const chain: string[] = []
    let current: Element | null = el
    while (current && current !== content && chain.length < 6) {
      chain.push(current.tagName.toLowerCase())
      current = current.parentElement
    }
    return chain.reverse().join('>')
  }

  const availableWidthOf = (el: Element): number => {
    const { paddingLeft, paddingRight } = getComputedStyle(el)
    return el.clientWidth - parseFloat(paddingLeft) - parseFloat(paddingRight)
  }

  /**
   * Reconstructs the whitespace-delimited tokens of an element that directly contains `<wbr>`,
   * tracking how many `<wbr>` fall inside each. Tokens that span a nested element boundary are
   * counted per-fragment, which can only understate a token's true width.
   */
  const tokensOf = (parent: Element): { token: string; wbrCount: number }[] => {
    let current = ''
    let currentWbrCount = 0
    const tokens: { token: string; wbrCount: number }[] = []

    const flush = () => {
      if (current.length > 0 && currentWbrCount > 0) {
        tokens.push({ token: current, wbrCount: currentWbrCount })
      }
      current = ''
      currentWbrCount = 0
    }

    Array.from(parent.childNodes).forEach((node) => {
      if (node.nodeName.toLowerCase() === 'wbr') {
        currentWbrCount += 1
        return
      }
      if (node.nodeType !== Node.TEXT_NODE) {
        flush()
        return
      }
      const text = node.textContent ?? ''
      text.split(/(\s+)/).forEach((part) => {
        if (/^\s+$/.test(part)) {
          flush()
          return
        }
        current += part
      })
    })
    flush()

    return tokens
  }

  const restoreNonWrappingContent = hideNonWrappingContent()

  setWbrSuppressed(false)
  const overflowWithWbr = documentOverflowPx()
  const overflowingElementsWithWbr = reflowableOverflowCount()
  const overflowSourcesWithWbr = overflowSources()

  // Token widths are measured with `<wbr>` suppressed so the ruler reflects the unbroken token,
  // which is the state the page would be in if we stopped inserting them.
  setWbrSuppressed(true)
  const overflowWithoutWbr = documentOverflowPx()
  const overflowingElementsWithoutWbr = reflowableOverflowCount()
  const overflowSourcesWithoutWbr = overflowSources()

  const ruler = document.createElement('span')
  ruler.style.cssText = 'position:absolute;left:-99999px;top:0;white-space:pre;visibility:hidden'

  const parents = new Set(Array.from(content.querySelectorAll('wbr'), (wbr) => wbr.parentElement).filter(Boolean))

  const tokens: TokenMeasurement[] = []

  parents.forEach((parent) => {
    if (!parent) {
      return
    }
    const block = blockAncestorOf(parent)
    const anchorId = anchorIdOf(parent)
    const containerChain = containerChainOf(block)
    const availableWidthPx = availableWidthOf(block)
    parent.append(ruler)

    tokensOf(parent).forEach(({ token, wbrCount }) => {
      ruler.textContent = token
      const intrinsicWidthPx = ruler.getBoundingClientRect().width
      tokens.push({
        token,
        anchorId,
        intrinsicWidthPx: Math.round(intrinsicWidthPx * 10) / 10,
        availableWidthPx: Math.round(availableWidthPx * 10) / 10,
        fitsUnbroken: intrinsicWidthPx <= availableWidthPx,
        wbrCount,
        containerTag: block.tagName.toLowerCase(),
        containerChain,
        hasUnderscore: token.includes('_'),
        hasCamelCase: /[a-z][A-Z]/.test(token) && token.length >= lengthGate,
        exceedsLengthGate: token.length > lengthGate,
        looksLikeUrl: token.includes('://') || token.includes('/')
      })
    })

    ruler.remove()
  })

  setWbrSuppressed(false)
  restoreNonWrappingContent()

  return {
    contentType:
      Array.from(content.classList)
        .find((name) => name.startsWith('rfc-content-type-'))
        ?.replace('rfc-content-type-', '') ?? 'unknown',
    wbrCount: content.querySelectorAll('wbr').length,
    overflowWithWbr,
    overflowWithoutWbr,
    overflowingElementsWithWbr,
    overflowingElementsWithoutWbr,
    overflowSourcesWithWbr,
    overflowSourcesWithoutWbr,
    tokens
  }
}

const measureRfc = async (page: Page, rfc: number, { viewportWidth, rootFontSizePx }: Cell) => {
  await page.setViewportSize({ width: viewportWidth, height: 900 })
  await page.goto(`${PROD_ORIGIN}/info/rfc${rfc}/`, { waitUntil: 'networkidle', timeout: 90_000 })
  await page.addStyleTag({ content: `html { font-size: ${rootFontSizePx}px }` })
  return page.evaluate(measureInPage, {
    contentSelector: RFC_CONTENT_SELECTOR,
    styleId: SUPPRESS_WBR_STYLE_ID,
    lengthGate: REQUIRE_WORDBREAK_AFTER_CHARS_LENGTH
  })
}

const buildCorpus = (corpus: string, limit: number, explicitRfcs: string): number[] => {
  if (explicitRfcs.length > 0) {
    return explicitRfcs.split(',').map(Number)
  }
  if (corpus === 'targeted') {
    return TARGETED_RFCS.slice(0, limit)
  }
  const sampled = []
  for (let rfc = FIRST_XML2RFC_RFC; rfc <= BROAD_SAMPLE_CEILING; rfc += BROAD_SAMPLE_STRIDE) {
    sampled.push(rfc)
  }
  const forced = TARGETED_RFCS.filter((rfc) => !sampled.includes(rfc))
  return [...sampled, ...forced].sort((a, b) => a - b).slice(0, limit)
}

const toCsv = (rows: Row[]): string => {
  const headers = [
    'rfc',
    'viewportWidth',
    'rootFontSizePx',
    'token',
    'url',
    'wbrCount',
    'containerTag',
    'containerChain',
    'intrinsicWidthPx',
    'availableWidthPx',
    'fitsUnbroken',
    'hasUnderscore',
    'hasCamelCase',
    'exceedsLengthGate',
    'looksLikeUrl'
  ]
  const escape = (value: unknown) => {
    const asString = String(value)
    return /[",\n]/.test(asString) ? `"${asString.replaceAll('"', '""')}"` : asString
  }
  return [
    headers.join(','),
    ...rows.map((row) => headers.map((header) => escape(row[header as keyof Row])).join(','))
  ].join('\n')
}

const parseArg = (name: string, fallback: string): string =>
  process.argv.find((arg) => arg.startsWith(`--${name}=`))?.split('=')[1] ?? fallback

const main = async () => {
  const corpus = parseArg('corpus', 'targeted')
  const limit = Number(parseArg('limit', '500'))
  const rfcs = buildCorpus(corpus, limit, parseArg('rfcs', ''))
  const widths = corpus === 'broad' ? BROAD_VIEWPORT_WIDTHS : VIEWPORT_WIDTHS
  const scales = corpus === 'broad' ? BROAD_TEXT_SCALES : TEXT_SCALES

  const cells: Cell[] = widths.flatMap((viewportWidth) =>
    scales.map((rootFontSizePx) => ({ viewportWidth, rootFontSizePx }))
  )

  console.log(`[wbr-measure] corpus=${corpus} rfcs=${rfcs.length} cells=${cells.length}`)

  let browser: Browser | undefined
  const rows: Row[] = []
  const pages: (PageMeasurement & { rfc: number } & Cell)[] = []
  const failures: { rfc: number; error: string }[] = []

  try {
    browser = await chromium.launch()
    const context = await browser.newContext()
    const page = await context.newPage()

    for (const rfc of rfcs) {
      for (const cell of cells) {
        try {
          const measurement = await measureRfc(page, rfc, cell)
          const { tokens, ...pageTotals } = measurement
          pages.push({ rfc, ...cell, ...pageTotals, tokens: [] })
          rows.push(
            ...tokens.map((token) => ({
              ...token,
              rfc,
              ...cell,
              url: `${PROD_ORIGIN}/info/rfc${rfc}/${token.anchorId ? `#${token.anchorId}` : ''}`
            }))
          )
        } catch (error: unknown) {
          failures.push({ rfc, error: String(error).slice(0, 200) })
        }
      }
      console.log(`[wbr-measure] rfc${rfc} done (${rows.length} token rows so far)`)
    }
  } finally {
    await browser?.close()
  }

  fs.mkdirSync(outputDir, { recursive: true })
  fs.writeFileSync(path.join(outputDir, `tokens-${corpus}.csv`), toCsv(rows))
  fs.writeFileSync(
    path.join(outputDir, `pages-${corpus}.json`),
    JSON.stringify({ generatedAt: new Date().toISOString(), corpus, failures, pages }, null, 2)
  )

  console.log(`[wbr-measure] wrote ${rows.length} token rows, ${pages.length} page rows to ${outputDir}`)
  if (failures.length > 0) {
    console.log(`[wbr-measure] ${failures.length} failures`, failures.slice(0, 5))
  }
}

await main()
