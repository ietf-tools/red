/**
 * Turns the measurements from wbr-measure.ts into report tables,
 * so every figure quoted in the report can be regenerated rather than transcribed.
 *
 * Usage:
 *   node scripts/word-breaks/wbr-report.ts --corpus=broad
 */
import fs from 'node:fs'
import path from 'node:path'

const dataDir = path.resolve(import.meta.dirname, '..', '..', '..', 'docs', 'mobile-layout', 'data')

const REQUIRE_WORDBREAK_AFTER_CHARS_LENGTH = 16

type Row = {
  rfc: string
  viewportWidth: string
  rootFontSizePx: string
  token: string
  url: string
  wbrCount: string
  containerTag: string
  containerChain: string
  intrinsicWidthPx: string
  availableWidthPx: string
  fitsUnbroken: string
  hasUnderscore: string
  hasCamelCase: string
  exceedsLengthGate: string
  looksLikeUrl: string
}

const parseCsv = (csv: string): Row[] => {
  const [headerLine, ...lines] = csv.trim().split('\n')
  const headers = headerLine.split(',')
  return lines.map((line) => {
    const cells: string[] = []
    let cell = ''
    let isQuoted = false
    for (let i = 0; i < line.length; i += 1) {
      const char = line[i]
      if (isQuoted) {
        if (char === '"' && line[i + 1] === '"') {
          cell += '"'
          i += 1
        } else if (char === '"') {
          isQuoted = false
        } else {
          cell += char
        }
      } else if (char === '"') {
        isQuoted = true
      } else if (char === ',') {
        cells.push(cell)
        cell = ''
      } else {
        cell += char
      }
    }
    cells.push(cell)
    return Object.fromEntries(headers.map((header, index) => [header, cells[index]])) as Row
  })
}

/**
 * Which insertion rule in precomputer/src/tasks/rfc-html.ts a token owes its `<wbr>` to. Tokens
 * matching no rule got one anyway: the rules measure a word including the whitespace that precedes
 * it, so mid-sentence words break one character earlier than the documented threshold.
 */
const triggerOf = (row: Row): string => {
  const hasUnderscore = row.hasUnderscore === 'true'
  const hasCamelCase = row.hasCamelCase === 'true'
  const exceedsLengthGate = row.exceedsLengthGate === 'true'
  if (exceedsLengthGate) {
    return hasUnderscore || hasCamelCase ? 'length gate + identifier rule' : 'length gate only'
  }
  if (hasUnderscore) {
    return 'underscore rule only'
  }
  if (hasCamelCase) {
    return 'camelCase rule only'
  }
  return `under the ${REQUIRE_WORDBREAK_AFTER_CHARS_LENGTH}-char gate (leading-space off-by-one)`
}

const isLoadBearing = (row: Row) => row.fitsUnbroken === 'false'

const dedupe = (rows: Row[]): Row[] => {
  const seen = new Map<string, Row>()
  rows.forEach((row) => {
    const key = `${row.rfc}|${row.token}|${row.url}`
    if (!seen.has(key)) {
      seen.set(key, row)
    }
  })
  return [...seen.values()]
}

const markdownTable = (headers: string[], rows: (string | number)[][]): string =>
  [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.join(' | ')} |`)
  ].join('\n')

const percent = (part: number, total: number) => (total === 0 ? '—' : `${Math.round((part / total) * 100)}%`)

const triggerTable = (rows: Row[]): string => {
  const byTrigger = new Map<string, { total: number; loadBearing: number }>()
  rows.forEach((row) => {
    const trigger = triggerOf(row)
    const entry = byTrigger.get(trigger) ?? { total: 0, loadBearing: 0 }
    entry.total += 1
    if (isLoadBearing(row)) {
      entry.loadBearing += 1
    }
    byTrigger.set(trigger, entry)
  })
  return markdownTable(
    ['Insertion rule', 'Tokens', 'Load-bearing', 'Inert', '% inert'],
    [...byTrigger.entries()]
      .sort((a, b) => b[1].total - a[1].total)
      .map(([trigger, { total, loadBearing }]) => [
        trigger,
        total,
        loadBearing,
        total - loadBearing,
        percent(total - loadBearing, total)
      ])
  )
}

const containerTable = (rows: Row[]): string => {
  const byContainer = new Map<string, number[]>()
  rows.forEach((row) => {
    const widths = byContainer.get(row.containerTag) ?? []
    widths.push(Number(row.availableWidthPx))
    byContainer.set(row.containerTag, widths)
  })
  return markdownTable(
    ['Container', 'Tokens measured', 'Median usable width', 'Narrowest'],
    [...byContainer.entries()]
      .map(([tag, widths]) => {
        const sorted = widths.sort((a, b) => a - b)
        return { tag, count: widths.length, median: sorted[Math.floor(sorted.length / 2)], min: sorted[0] }
      })
      .sort((a, b) => a.median - b.median)
      .map(({ tag, count, median, min }) => [`\`<${tag}>\``, count, `${median}px`, `${min}px`])
  )
}

// One row per distinct token: a term like CONNECTION_CLOSE appears dozens of times in a document
// and repeating it would crowd out the range of cases the table is meant to show.
const distinctTokens = (rows: Row[]): Row[] => {
  const seen = new Map<string, Row>()
  rows.forEach((row) => {
    if (!seen.has(row.token)) {
      seen.set(row.token, row)
    }
  })
  return [...seen.values()]
}

const exampleTable = (rows: Row[], limit: number): string =>
  markdownTable(
    ['Token', 'Needs', 'Has', 'Rule', 'Where'],
    distinctTokens(rows)
      .slice(0, limit)
      .map((row) => [
        `\`${row.token.replaceAll('|', '\\|')}\``,
        `${Math.round(Number(row.intrinsicWidthPx))}px`,
        `${Math.round(Number(row.availableWidthPx))}px`,
        triggerOf(row),
        `[RFC ${row.rfc}](${row.url})`
      ])
  )

const main = () => {
  const corpus = process.argv.find((arg) => arg.startsWith('--corpus='))?.split('=')[1] ?? 'broad'
  const rows = parseCsv(fs.readFileSync(path.join(dataDir, `tokens-${corpus}.csv`), 'utf8'))
  const pages = JSON.parse(fs.readFileSync(path.join(dataDir, `pages-${corpus}.json`), 'utf8'))

  const atDefault = dedupe(rows.filter((row) => row.viewportWidth === '320' && row.rootFontSizePx === '16'))
  const atDouble = dedupe(rows.filter((row) => row.viewportWidth === '320' && row.rootFontSizePx === '32'))

  const documents = new Set(rows.map((row) => row.rfc))
  const eligiblePages = pages.pages.filter((page: { contentType: string }) => page.contentType === 'xml2rfc')

  const sections = [
    '<!-- Generated by website/scripts/word-breaks/wbr-report.ts. Do not edit by hand. -->',
    '',
    '## Corpus',
    '',
    `- Documents measured: **${documents.size}** (xml2rfc format; plain-text RFCs receive no word breaks at all)`,
    `- Page measurements: **${eligiblePages.length}**`,
    `- Unique word-break-bearing tokens at 320px: **${atDefault.length}**`,
    `- Total \`<wbr>\` elements across the sample: **${eligiblePages
      .reduce((total: number, page: { wbrCount: number }) => total + page.wbrCount, 0)
      .toLocaleString()}**`,
    '',
    '## Which insertion rule earns its place (320px viewport, default text size)',
    '',
    triggerTable(atDefault),
    '',
    '## The same rules at 200% text size (WCAG 2.2 SC 1.4.4)',
    '',
    triggerTable(atDouble),
    '',
    '## Usable width by document context (320px viewport, default text size)',
    '',
    containerTable(atDefault),
    '',
    '## Tokens that genuinely overflow at default text size',
    '',
    exampleTable(
      atDefault.filter(isLoadBearing).sort((a, b) => Number(b.intrinsicWidthPx) - Number(a.intrinsicWidthPx)),
      15
    ),
    '',
    '## Identifiers that overflow only once text is enlarged to 200%',
    '',
    exampleTable(
      atDouble
        .filter((row) => isLoadBearing(row) && triggerOf(row) === 'underscore rule only')
        .sort((a, b) => Number(b.intrinsicWidthPx) - Number(a.intrinsicWidthPx)),
      15
    ),
    ''
  ]

  const outputPath = path.join(dataDir, `generated-tables-${corpus}.md`)
  fs.writeFileSync(outputPath, sections.join('\n'))
  console.log(`[wbr-report] wrote ${outputPath}`)
}

main()
