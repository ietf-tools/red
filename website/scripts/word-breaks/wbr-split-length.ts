/**
 * Recommends a word-break split length by simulating candidate values against real documents.
 *
 * `REQUIRE_WORDBREAK_AFTER_CHARS_LENGTH` in precomputer/src/tasks/rfc-html.ts is currently 16 and
 * has no recorded derivation. It also does three jobs at once: it gates whether a word is broken at
 * all, sets the camelCase minimum, and sets how finely `chunkString()` sub-divides what is left.
 *
 * Rather than republish the corpus per candidate, this reimplements the precomputer's chunking in
 * the page and asks, for each candidate length: what is the widest *unbreakable* run it would leave
 * in each token, and does that run fit the space the token actually has? A candidate keeps mobile
 * support when every token's widest run fits; the number of breaks it inserts measures how intrusive
 * it is. The recommendation is the largest length that still fits — fewest breaks, no overflow.
 *
 * Pass --origin to measure a dev server: prod lags behind the current CSS and the current break
 * rules, and both change which candidate wins.
 *
 * Document selection comes from rfc-samples.ts, which every script here shares:
 *
 *   node scripts/word-breaks/wbr-split-length.ts                          the curated complex-layout set
 *   node scripts/word-breaks/wbr-split-length.ts --from=9700 --to=9900    a range, e.g. RFCs published since
 *   node scripts/word-breaks/wbr-split-length.ts --rfcs=9000,9110         specific documents
 *
 * Add --origin=http://localhost:3000 to measure unreleased rules.
 */
import fs from 'node:fs'
import path from 'node:path'
import { chromium, type Browser, type Page } from 'playwright'
import { noteForRfc, selectRfcs } from '../rfc-samples.ts'

const DEFAULT_ORIGIN = 'https://www.rfc-editor.org'

/** Point at a dev server to measure the current rules; prod lags behind them. */
const origin = process.argv.find((arg) => arg.startsWith('--origin='))?.split('=')[1] ?? DEFAULT_ORIGIN

const RFC_CONTENT_SELECTOR = '.rfc-content'

/** The current value, included so the table always shows the status quo for comparison. */
const CURRENT_SPLIT_LENGTH = 16

// Candidates below the shipped value are included so the table shows whether it is a floor or
// merely where tuning stopped.
const TRIGGER_LENGTHS = [8, 10, 12, 14, 16, 20, 24, 30, 40]

const CHUNK_LENGTHS = [8, 10, 12, 16, 20, 30]

/**
 * Today one constant is both the trigger and the chunk size. Measuring them as a grid separates the
 * two questions: a larger trigger touches fewer words at all, while a small chunk size keeps the
 * long words that do get broken sub-divided finely enough to fit.
 */
const CANDIDATES = TRIGGER_LENGTHS.flatMap((trigger) => CHUNK_LENGTHS.map((chunk) => ({ trigger, chunk })))

const VIEWPORT_WIDTH = 320

const ROOT_FONT_SIZES_PX = [16, 24, 32]

const outputDir = path.resolve(import.meta.dirname, '..', '..', '..', 'docs', 'mobile-layout', 'data')

type CandidateResult = {
  trigger: number
  chunk: number
  breaksInserted: number
  tokensOverflowing: number
  tokensOverflowingInScroller: number
  worstOverflowPx: number
}

type PageResult = {
  rfc: number
  rootFontSizePx: number
  tokensMeasured: number
  candidates: CandidateResult[]
}

/**
 * Runs in the page. Reimplements precomputer/src/utilities/string.ts `chunkString()` and the
 * trigger rules from `ensureWordBreaks()`, parameterised by the candidate length.
 */
const simulateInPage = ({
  contentSelector,
  candidates,
  indentFixCss
}: {
  contentSelector: string
  candidates: { trigger: number; chunk: number }[]
  indentFixCss: string
}) => {
  const content = document.querySelector(contentSelector)
  if (!content) {
    throw Error(`No ${contentSelector} on ${window.location.href}`)
  }

  const style = document.createElement('style')
  style.textContent = `pre, svg { display: none !important } wbr { display: none !important } ${indentFixCss}`
  document.head.append(style)

  const allIndexes = (str: string, pattern: RegExp): number[] =>
    Array.from(str.matchAll(pattern), (match) => match.index)

  // Ported from chunkString() in precomputer/src/utilities/string.ts. Every rule below has a
  // counterpart there, and a difference between the two makes this measurement wrong rather than
  // merely imprecise: a drifted copy has already produced figures that had to be withdrawn.
  const chunkString = (str: string, maxChunkLength: number): string[] => {
    const chunks: string[] = []
    let out = str
    const protocolIndex = out.indexOf('://')
    if (protocolIndex !== -1) {
      chunks.push(out.substring(0, protocolIndex + 3))
      out = out.substring(protocolIndex + 3)
    }

    // Mirrors isWordlike(): a run reading as a word is never subdivided at a fixed length, because
    // splitting prose mid-word is the orphaning the exercise set out to remove. Declared ahead of
    // its first use, which the slash rule needs.
    const LONGEST_PLAUSIBLE_WORD = 20
    const isWordlike = (run: string): boolean => {
      const core = run.replace(/^["'“”‘’([<\-/.:@_]+/, '').replace(/["'“”‘’)\]>,.;:!?¶\-/]+$/, '')
      return core.length > 0 && core.length <= LONGEST_PLAUSIBLE_WORD && /^[A-Za-z]+(['\-/][A-Za-z]+)?$/.test(core)
    }

    // A hyphen ends its chunk, as an underscore does; a slash joining two ordinary words is not a
    // break point at all; every other separator run starts the next chunk.
    const separatorRuns = Array.from(out.matchAll(/[@\\/:&\-=()\.\?%]+/g))
    const slashesJoinWords = out.split('/').length > 1 && out.split('/').every(isWordlike)

    const breakBefore: number[] = []
    const breakAfter: number[] = []
    separatorRuns.forEach((run) => {
      const separator = run[0]
      if (/^-+$/.test(separator)) {
        breakAfter.push(run.index + separator.length)
        return
      }
      if (/^\/+$/.test(separator) && slashesJoinWords) {
        return
      }
      breakBefore.push(run.index)
    })
    breakAfter.push(...Array.from(out.matchAll(/_+/g), (match) => match.index + match[0].length))

    const camelCase = allIndexes(out, /[a-z][A-Z]/g).map((index) => index + 1)

    const breakIndexes = [...new Set([...breakBefore, ...breakAfter, ...camelCase])]
      .filter((index) => index > 0 && index < out.length)
      .sort((a, b) => a - b)

    breakIndexes.forEach((strIndex, arrIndex) => {
      chunks.push(arrIndex === 0 ? out.substring(0, strIndex) : out.substring(breakIndexes[arrIndex - 1], strIndex))
    })
    chunks.push(breakIndexes.length > 0 ? out.substring(breakIndexes[breakIndexes.length - 1]) : out)

    // A trailing separator is itself a break opportunity, so it is not part of the run a reader
    // cannot break inside.
    const unbreakableLength = (chunk: string): number => chunk.replace(/[-_]+$/, '').length

    const sized = chunks.flatMap((chunk) => {
      if (unbreakableLength(chunk) <= maxChunkLength || isWordlike(chunk)) {
        return chunk
      }
      // Even distribution, as chunkStringAtLengths does: filling to the limit leaves a short
      // remainder that the minimum-fragment rule would then have to delete the break for.
      const pieceCount = Math.ceil(chunk.length / maxChunkLength)
      const pieceSize = Math.ceil(chunk.length / pieceCount)
      const pieces: string[] = []
      for (let offset = 0; offset < chunk.length; offset += pieceSize) {
        pieces.push(chunk.substring(offset, offset + pieceSize))
      }
      return pieces.filter((piece) => piece.length > 0)
    })

    // mergeShortChunks: never strand a fragment shorter than this, except a named segment following
    // an underscore, which is part of an identifier rather than a fragment of a word.
    const MIN_FRAGMENT = 3
    return sized.reduce<string[]>((merged, chunk) => {
      const previous = merged[merged.length - 1]
      const namedSegment = /[A-Za-z]/.test(chunk) && (previous ?? '').endsWith('_')
      const stranded = chunk.length < MIN_FRAGMENT && !namedSegment
      if (previous !== undefined && (stranded || previous.length < MIN_FRAGMENT)) {
        merged[merged.length - 1] = previous + chunk
        return merged
      }
      merged.push(chunk)
      return merged
    }, [])
  }

  const DOTTED_SEGMENTS = /[A-Za-z0-9]{2,}\.[A-Za-z0-9]{2,}/
  const DOTTED_HAS_LETTERS = /[A-Za-z0-9]*[A-Za-z][A-Za-z0-9]*\.[A-Za-z0-9]*[A-Za-z][A-Za-z0-9]*/
  const INTERNAL_DOT = /[A-Za-z0-9]\.[A-Za-z0-9]/
  const INTERNAL_SLASH = /[A-Za-z0-9]\/[A-Za-z0-9]/

  const isMachineReadableName = (word: string): boolean =>
    (DOTTED_SEGMENTS.test(word) && DOTTED_HAS_LETTERS.test(word)) ||
    (INTERNAL_DOT.test(word) && INTERNAL_SLASH.test(word))

  const isBroken = (word: string, trigger: number): boolean =>
    word.length > trigger ||
    /_/.test(word) ||
    isMachineReadableName(word) ||
    (/[a-z][A-Z]/.test(word) && word.length >= trigger)

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

  /**
   * Whether a token sits inside something that scrolls horizontally. Tables, ABNF blocks and
   * artwork are wrapped in scrollers and are *meant* to exceed their container, so a wide run
   * inside one does not reach the reader as broken layout. Counting them conflates "does not fit"
   * with "breaks the page", and inflates what a shorter run length appears to fix.
   */
  const inHorizontalScroller = (el: Element): boolean => {
    let node: Element | null = el
    while (node && node !== content) {
      const { overflowX } = getComputedStyle(node)
      if (['auto', 'scroll'].includes(overflowX)) {
        return true
      }
      node = node.parentElement
    }
    return false
  }

  const availableWidthOf = (el: Element): number => {
    const { paddingLeft, paddingRight } = getComputedStyle(el)
    return el.clientWidth - parseFloat(paddingLeft) - parseFloat(paddingRight)
  }

  const tokensOf = (parent: Element): string[] => {
    let current = ''
    let hasWbr = false
    const tokens: string[] = []
    const flush = () => {
      if (current.length > 0 && hasWbr) {
        tokens.push(current)
      }
      current = ''
      hasWbr = false
    }
    Array.from(parent.childNodes).forEach((node) => {
      if (node.nodeName.toLowerCase() === 'wbr') {
        hasWbr = true
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
        current += part
      })
    })
    flush()
    return tokens
  }

  const ruler = document.createElement('span')
  ruler.style.cssText = 'position:absolute;left:-99999px;top:0;white-space:pre;visibility:hidden'

  const results = candidates.map(({ trigger, chunk }) => ({
    trigger,
    chunk,
    breaksInserted: 0,
    tokensOverflowing: 0,
    tokensOverflowingInScroller: 0,
    worstOverflowPx: 0
  }))

  let tokensMeasured = 0

  const parents = new Set(Array.from(content.querySelectorAll('wbr'), (wbr) => wbr.parentElement).filter(Boolean))

  parents.forEach((parent) => {
    if (!parent) {
      return
    }
    const availableWidthPx = availableWidthOf(blockAncestorOf(parent))
    const exempt = inHorizontalScroller(parent)
    parent.append(ruler)
    const widthCache = new Map<string, number>()
    const widthOf = (text: string): number => {
      const cached = widthCache.get(text)
      if (cached !== undefined) {
        return cached
      }
      ruler.textContent = text
      const width = ruler.getBoundingClientRect().width
      widthCache.set(text, width)
      return width
    }

    tokensOf(parent).forEach((token) => {
      tokensMeasured += 1
      results.forEach((result) => {
        const { trigger, chunk } = result
        // An unbroken word is one unbreakable run: the whole token.
        const runs = isBroken(token, trigger) ? chunkString(token, chunk) : [token]
        const widestRunPx = Math.max(...runs.map(widthOf))
        result.breaksInserted += Math.max(0, runs.length - 1)
        if (widestRunPx > availableWidthPx) {
          if (exempt) {
            result.tokensOverflowingInScroller += 1
          } else {
            result.tokensOverflowing += 1
            result.worstOverflowPx = Math.max(result.worstOverflowPx, Math.round(widestRunPx - availableWidthPx))
          }
        }
      })
    })

    ruler.remove()
  })

  style.remove()

  return { tokensMeasured, candidates: results }
}

const measureRfc = async (page: Page, rfc: number, rootFontSizePx: number) => {
  await page.setViewportSize({ width: VIEWPORT_WIDTH, height: 900 })
  await page.goto(`${origin}/info/rfc${rfc}/`, { waitUntil: 'networkidle', timeout: 120_000 })
  await page.addStyleTag({ content: `html { font-size: ${rootFontSizePx}px }` })
  return page.evaluate(simulateInPage, {
    contentSelector: RFC_CONTENT_SELECTOR,
    candidates: CANDIDATES,
    indentFixCss: ''
  })
}

const summarise = (pages: PageResult[]) => {
  const byScale = new Map<number, Map<string, CandidateResult>>()
  pages.forEach(({ rootFontSizePx, candidates }) => {
    const forScale = byScale.get(rootFontSizePx) ?? new Map<string, CandidateResult>()
    candidates.forEach((candidate) => {
      const key = `${candidate.trigger}/${candidate.chunk}`
      const running = forScale.get(key) ?? {
        trigger: candidate.trigger,
        chunk: candidate.chunk,
        breaksInserted: 0,
        tokensOverflowing: 0,
        tokensOverflowingInScroller: 0,
        worstOverflowPx: 0
      }
      running.breaksInserted += candidate.breaksInserted
      running.tokensOverflowing += candidate.tokensOverflowing
      running.tokensOverflowingInScroller += candidate.tokensOverflowingInScroller
      running.worstOverflowPx = Math.max(running.worstOverflowPx, candidate.worstOverflowPx)
      forScale.set(key, running)
    })
    byScale.set(rootFontSizePx, forScale)
  })
  return byScale
}

const main = async () => {
  const { rfcs, selection } = await selectRfcs()

  console.log(`[wbr-split-length] ${selection}, ${rfcs.length} documents, ${CANDIDATES.length} candidates`)

  let browser: Browser | undefined
  const pages: PageResult[] = []
  const failures: { rfc: number; error: string }[] = []

  try {
    browser = await chromium.launch()
    const page = await (await browser.newContext()).newPage()

    for (const rfc of rfcs) {
      for (const rootFontSizePx of ROOT_FONT_SIZES_PX) {
        try {
          const { tokensMeasured, candidates } = await measureRfc(page, rfc, rootFontSizePx)
          pages.push({ rfc, rootFontSizePx, tokensMeasured, candidates })
        } catch (error: unknown) {
          failures.push({ rfc, error: String(error).slice(0, 160) })
        }
      }
      const note = noteForRfc(rfc)
      console.log(`[wbr-split-length] rfc${rfc} done${note ? ` — ${note}` : ''}`)
    }
  } finally {
    await browser?.close()
  }

  const byScale = summarise(pages)

  const lines = [
    '<!-- Generated by website/scripts/word-breaks/wbr-split-length.ts. Do not edit by hand. -->',
    '',
    '# Candidate word-break split lengths',
    '',
    `Simulated on ${new Set(pages.map((page) => page.rfc)).size} documents at a ${VIEWPORT_WIDTH}px viewport`,
    `against ${origin}. "Breaks" is how many break opportunities the candidate would insert; "tokens`,
    'overflowing" is how many tokens would still not fit. Mirrors the production chunker, including',
    'even distribution and the minimum-fragment merge.',
    ''
  ]

  ;[...byScale.entries()]
    .sort((a, b) => a[0] - b[0])
    .forEach(([rootFontSizePx, forScale]) => {
      lines.push(`## ${Math.round((rootFontSizePx / 16) * 100)}% text size`, '')
      lines.push('| Trigger | Chunk | Breaks inserted | Tokens overflowing | Worst overflow | In a scroller |')
      lines.push('| --- | --- | --- | --- | --- |')
      ;[...forScale.values()]
        .sort((a, b) => a.trigger - b.trigger || a.chunk - b.chunk)
        .forEach(
          ({ trigger, chunk, breaksInserted, tokensOverflowing, worstOverflowPx, tokensOverflowingInScroller }) => {
            const isCurrent = trigger === CURRENT_SPLIT_LENGTH && chunk === CURRENT_SPLIT_LENGTH
            const suffix = isCurrent ? ' (current)' : ''
            lines.push(
              `| ${trigger}${suffix} | ${chunk} | ${breaksInserted.toLocaleString()} | ${tokensOverflowing.toLocaleString()} | ${worstOverflowPx}px | ${tokensOverflowingInScroller.toLocaleString()} |`
            )
          }
        )

      // The best candidate is the one that inserts fewest breaks while still fitting everything;
      // where nothing fits, the one that leaves fewest tokens overflowing.
      const clean = [...forScale.values()]
        .filter(({ tokensOverflowing }) => tokensOverflowing === 0)
        .sort((a, b) => a.breaksInserted - b.breaksInserted)[0]
      const leastBad = [...forScale.values()].sort(
        (a, b) => a.tokensOverflowing - b.tokensOverflowing || a.breaksInserted - b.breaksInserted
      )[0]
      lines.push(
        clean
          ? `Fewest breaks with no overflow: **trigger ${clean.trigger} / chunk ${clean.chunk}** (${clean.breaksInserted.toLocaleString()} breaks).`
          : `No candidate avoids overflow entirely. Closest: **trigger ${leastBad.trigger} / chunk ${leastBad.chunk}** (${leastBad.tokensOverflowing.toLocaleString()} tokens overflowing, ${leastBad.breaksInserted.toLocaleString()} breaks).`,
        ''
      )
    })

  fs.mkdirSync(outputDir, { recursive: true })
  const markdownPath = path.join(outputDir, `split-length.md`)
  fs.writeFileSync(markdownPath, lines.join('\n'))
  fs.writeFileSync(
    path.join(outputDir, `split-length.json`),
    JSON.stringify({ generatedAt: new Date().toISOString(), origin, selection, failures, pages }, null, 2)
  )

  console.log(lines.join('\n'))
  console.log(`[wbr-split-length] wrote ${markdownPath}`)
  if (failures.length > 0) {
    console.log(`[wbr-split-length] ${failures.length} failures`, failures.slice(0, 3))
  }
}

await main()
