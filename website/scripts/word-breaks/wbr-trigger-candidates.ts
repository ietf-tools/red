/**
 * Compares candidate `<wbr>` trigger rules against the words that actually appear in RFCs.
 *
 * Today a word is broken only if it is longer than the length gate, contains an underscore, or is a
 * long camelCase run (precomputer/src/tasks/rfc-html.ts). Periods are a *placement* rule, not a
 * trigger: `chunkString()` will break before a `.` but only once something else has decided the word
 * is breakable at all. That is why `mail.isp.example` — 16 characters, sole content of its `<code>`
 * element, so no leading space to push it over the gate — receives no breaks and overflows a narrow
 * list item, while `_imaps.isp.example` beside it wraps cleanly.
 *
 * Making "contains an internal period" a trigger would fix that, but the code comments warn it also
 * catches prose: `e.g.`, `U.S.`, `Section 3.1`, `document.` — and because periods are break-*before*,
 * a line could begin with `.`, which is the complaint #424 was raised about. This script quantifies
 * both sides: how many genuine identifiers a candidate rule newly catches, and how much prose it
 * damages.
 *
 * Document selection comes from rfc-samples.ts, shared by every script here:
 *
 *   (no flags)                 the curated complex-layout set
 *   --from=9700 --to=9900      a range, e.g. RFCs published since this was last run
 *   --rfcs=9000,9110           specific documents
 */
import fs from 'node:fs'
import path from 'node:path'
import { chromium, type Browser, type Page } from 'playwright'
import { noteForRfc, selectRfcs } from '../rfc-samples.ts'

const PROD_ORIGIN = 'https://www.rfc-editor.org'

const LENGTH_GATE = 16

const outputDir = path.resolve(import.meta.dirname, '..', '..', '..', 'docs', 'mobile-layout', 'data')

/** Words as the precomputer sees them: whitespace-delimited, outside `pre`/`svg`. */
const collectWords = ({ contentSelector }: { contentSelector: string }) => {
  const content = document.querySelector(contentSelector)
  if (!content) {
    throw Error(`No ${contentSelector}`)
  }
  const counts: Record<string, number> = {}

  // Words must be reconstructed across `<wbr>`: inserting one splits the text node, so reading text
  // nodes individually would see `https://`, `.rfc` and `.org` as separate words rather than one URL,
  // and every already-broken word would be counted as fragments.
  const collectFrom = (parent: Element) => {
    let current = ''
    const flush = () => {
      if (current.length > 0) {
        counts[current] = (counts[current] ?? 0) + 1
      }
      current = ''
    }
    Array.from(parent.childNodes).forEach((node) => {
      if (node.nodeName.toLowerCase() === 'wbr') {
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
  }

  Array.from(content.querySelectorAll('*'))
    .filter((el) => !el.closest('pre, svg'))
    .forEach(collectFrom)

  return counts
}

const triggersToday = (word: string): boolean =>
  word.length > LENGTH_GATE || /_/.test(word) || (/[a-z][A-Z]/.test(word) && word.length >= LENGTH_GATE)

/**
 * A period is a word-internal separator only when it has real segments on both sides. Requiring two
 * or more alphanumerics either side excludes initials (`P.`), abbreviations (`e.g.`, `U.S.`), section
 * numbers (`3.1`) and decimals (`1.5`), and requiring a following character excludes the period that
 * ends a sentence.
 */
const MIN_SEGMENT = 2

const hasInternalDottedName = (word: string): boolean =>
  new RegExp(`[A-Za-z0-9]{${MIN_SEGMENT},}\\.[A-Za-z0-9]{${MIN_SEGMENT},}`).test(word)

/**
 * As above, but each segment must contain a letter. Section cross-references (`19.15`), decimals and
 * dotted numbers are then left alone: they are short, they fit, and breaking them would put a bare
 * `.15` at the start of a line for no benefit.
 */
const hasInternalDottedWordyName = (word: string): boolean =>
  /[A-Za-z0-9]*[A-Za-z][A-Za-z0-9]*\.[A-Za-z0-9]*[A-Za-z][A-Za-z0-9]*/.test(word) &&
  new RegExp(`[A-Za-z0-9]{${MIN_SEGMENT},}\\.[A-Za-z0-9]{${MIN_SEGMENT},}`).test(word)

/** A separator only counts when it sits between two alphanumerics, so `Note:` is untouched. */
const hasInternalUrlishSeparator = (word: string): boolean => /[A-Za-z0-9][/:@=?%\\][A-Za-z0-9]/.test(word)

/** Characters that only occur inside URLs, paths, emails and similar machine-readable strings. */
const hasUrlishSeparator = (word: string): boolean => /[/:@=?%\\]/.test(word)

const CANDIDATES: { name: string; test: (word: string) => boolean }[] = [
  { name: 'today', test: triggersToday },
  { name: 'today + internal dotted name', test: (word) => triggersToday(word) || hasInternalDottedName(word) },
  {
    name: 'today + internal dotted name, letters required',
    test: (word) => triggersToday(word) || hasInternalDottedWordyName(word)
  },
  { name: 'today + any url-ish char', test: (word) => triggersToday(word) || hasUrlishSeparator(word) },
  {
    name: 'today + internal url-ish separator',
    test: (word) => triggersToday(word) || hasInternalUrlishSeparator(word)
  },
  {
    name: 'today + internal dotted (letters) + internal url-ish',
    test: (word) => triggersToday(word) || hasInternalDottedWordyName(word) || hasInternalUrlishSeparator(word)
  },
  { name: 'any period at all (naive)', test: (word) => triggersToday(word) || word.includes('.') }
]

/** Rough split of newly-caught words into machine-readable strings and ordinary prose. */
const looksMachineReadable = (word: string): boolean =>
  /[/:@=?%\\_]/.test(word) || hasInternalDottedName(word) || /\d/.test(word.replace(/\.$/, ''))

const collect = async (page: Page, rfc: number): Promise<Record<string, number>> => {
  await page.setViewportSize({ width: 320, height: 900 })
  await page.goto(`${PROD_ORIGIN}/info/rfc${rfc}/`, { waitUntil: 'networkidle', timeout: 90_000 })
  return page.evaluate(collectWords, { contentSelector: '.rfc-content' })
}

const main = async () => {
  const { rfcs, selection } = await selectRfcs()
  console.log(`[wbr-trigger-candidates] ${selection}`)

  let browser: Browser | undefined
  const counts = new Map<string, number>()

  try {
    browser = await chromium.launch()
    const page = await (await browser.newContext()).newPage()
    for (const rfc of rfcs) {
      const words = await collect(page, rfc)
      Object.entries(words).forEach(([word, count]) => counts.set(word, (counts.get(word) ?? 0) + count))
      const note = noteForRfc(rfc)
      console.log(
        `[wbr-trigger-candidates] rfc${rfc} done (${counts.size} distinct words so far)${note ? ` — ${note}` : ''}`
      )
    }
  } finally {
    await browser?.close()
  }

  const words = [...counts.entries()].map(([word, count]) => ({ word, count }))
  const totalOccurrences = words.reduce((sum, { count }) => sum + count, 0)

  const baseline = new Set(words.filter(({ word }) => triggersToday(word)).map(({ word }) => word))

  const lines = [
    '<!-- Generated by website/scripts/word-breaks/wbr-trigger-candidates.ts. Do not edit by hand. -->',
    '',
    '# Candidate word-break trigger rules',
    '',
    `${rfcs.length} documents, ${words.length.toLocaleString()} distinct words, ${totalOccurrences.toLocaleString()} occurrences.`,
    '',
    '| Rule | Words triggered | Newly triggered | Newly triggered that look machine-readable | …that look like prose |',
    '| --- | --- | --- | --- | --- |'
  ]

  const details: string[] = []

  CANDIDATES.forEach(({ name, test }) => {
    const triggered = words.filter(({ word }) => test(word))
    const newly = triggered.filter(({ word }) => !baseline.has(word))
    const machine = newly.filter(({ word }) => looksMachineReadable(word))
    const prose = newly.filter(({ word }) => !looksMachineReadable(word))
    lines.push(
      `| ${name} | ${triggered.length.toLocaleString()} | ${newly.length.toLocaleString()} | ${machine.length.toLocaleString()} | ${prose.length.toLocaleString()} |`
    )

    if (newly.length > 0) {
      const sample = (list: typeof newly) =>
        list
          .sort((a, b) => b.count - a.count)
          .slice(0, 12)
          .map(({ word, count }) => `\`${word}\` (${count})`)
          .join(', ')
      details.push(
        `### ${name}`,
        '',
        `- machine-readable, newly broken: ${machine.length > 0 ? sample(machine) : '—'}`,
        `- prose, newly broken: ${prose.length > 0 ? sample(prose) : '—'}`,
        ''
      )
    }
  })

  lines.push('', '## Newly triggered samples, by rule', '', ...details)

  fs.mkdirSync(outputDir, { recursive: true })
  const outputPath = path.join(outputDir, 'trigger-candidates.md')
  fs.writeFileSync(outputPath, lines.join('\n'))
  console.log(lines.join('\n'))
  console.log(`[wbr-trigger-candidates] wrote ${outputPath}`)
}

await main()
