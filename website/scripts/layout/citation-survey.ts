/**
 * Surveys bracketed reference citations — `[RFC3629]`, `[OAM-CONS]` — measuring how wide they are
 * and how often they wrap.
 *
 * The precomputer holds a citation on one line wherever its container has room for it, and
 * unconditionally up to a cap that fits the narrowest column, so that cap has to come from a
 * measured distribution rather than a guess. This produces that distribution, and the wrap rates
 * that justify doing anything at all.
 *
 * Widths are in em so they can be compared against the cap, which is also in em.
 *
 * Usage:
 *   node scripts/layout/citation-survey.ts --origin=http://localhost:3000
 */
import fs from 'node:fs'
import path from 'node:path'
import { chromium, type Page } from 'playwright'
import { selectRfcs } from '../rfc-samples.ts'

const DEFAULT_ORIGIN = 'https://www.rfc-editor.org'
const origin = process.argv.find((arg) => arg.startsWith('--origin='))?.split('=')[1] ?? DEFAULT_ORIGIN

/** The width up to which a citation is held whole unconditionally, so the survey can report what falls under it. */
const WIDTH_CAP_EM = 8

const VIEWPORT = { width: 320, height: 900 }
const TEXT_SIZES = [
  { label: '100%', standard: 16, fixed: 13 },
  { label: '200%', standard: 32, fixed: 26 }
]

const outputDir = path.resolve(import.meta.dirname, '..', '..', '..', 'docs', 'mobile-layout', 'data')

/** Runs in the page: every citation span with its width and whether it wrapped. */
const collectCitations = () => {
  const isCitation = (span: Element): boolean => {
    const children = Array.from(span.childNodes)
    if (children.length !== 3) {
      return false
    }
    const [open, link, close] = children
    return (
      open.nodeType === Node.TEXT_NODE &&
      (open.textContent ?? '').trimEnd().endsWith('[') &&
      link.nodeType === Node.ELEMENT_NODE &&
      (link as Element).tagName === 'A' &&
      close.nodeType === Node.TEXT_NODE &&
      (close.textContent ?? '').trimStart().startsWith(']')
    )
  }

  return Array.from(document.querySelectorAll('.rfc-content span'))
    .filter(isCitation)
    .map((span) => {
      const fontSizePx = parseFloat(getComputedStyle(span).fontSize)
      const rects = Array.from(span.getClientRects())
      // One rect per line fragment; distinct tops give the line count.
      const lines = new Set(rects.map((rect) => Math.round(rect.top))).size
      const widthPx = rects.reduce((total, rect) => total + rect.width, 0)
      return {
        text: (span.textContent ?? '').trim(),
        widthEm: Math.round((widthPx / fontSizePx) * 100) / 100,
        lines
      }
    })
}

type Citation = { text: string; widthEm: number; lines: number }

const percentile = (sorted: number[], fraction: number): number =>
  sorted.length === 0 ? 0 : sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))]

const surveyDocument = async (page: Page, rfc: number): Promise<Citation[]> => {
  await page.goto(`${origin}/info/rfc${rfc}/`, { waitUntil: 'networkidle', timeout: 120_000 })
  await page.evaluate(() => document.fonts.ready.then(() => undefined))
  return page.evaluate(collectCitations)
}

const main = async () => {
  const { rfcs, selection } = await selectRfcs()
  console.log(`[citation-survey] origin=${origin}, ${selection}`)

  const browser = await chromium.launch()
  const perSize: Record<string, { citations: Citation[]; perRfc: Record<number, number> }> = {}

  try {
    for (const size of TEXT_SIZES) {
      const context = await browser.newContext({ viewport: VIEWPORT })
      const page = await context.newPage()
      const cdp = await context.newCDPSession(page)
      await cdp.send('Page.setFontSizes', { fontSizes: { standard: size.standard, fixed: size.fixed } })

      const citations: Citation[] = []
      const perRfc: Record<number, number> = {}
      for (const rfc of rfcs) {
        try {
          const found = await surveyDocument(page, rfc)
          citations.push(...found)
          perRfc[rfc] = found.length
        } catch (error) {
          console.log(`  rfc${rfc}: ${error instanceof Error ? error.message.split('\n')[0] : error}`)
        }
      }
      perSize[size.label] = { citations, perRfc }
      console.log(`[citation-survey] ${size.label}: ${citations.length} citations`)
      await context.close()
    }
  } finally {
    await browser.close()
  }

  const baseline = perSize['100%'].citations
  const widths = baseline.map((c) => c.widthEm).sort((a, b) => a - b)
  const distinct = new Set(baseline.map((c) => c.text))
  const withinCap = baseline.filter((c) => c.widthEm <= WIDTH_CAP_EM).length
  const widest = [...baseline].sort((a, b) => b.widthEm - a.widthEm).slice(0, 5)

  const wrapRate = (label: string) => {
    const list = perSize[label].citations
    const wrapped = list.filter((c) => c.lines > 1).length
    return { wrapped, total: list.length, percent: Math.round((wrapped / Math.max(1, list.length)) * 100) }
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    origin,
    viewportWidth: VIEWPORT.width,
    widthCapEm: WIDTH_CAP_EM,
    documents: Object.keys(perSize['100%'].perRfc).length,
    citations: baseline.length,
    distinctNames: distinct.size,
    widthEm: {
      median: percentile(widths, 0.5),
      p90: percentile(widths, 0.9),
      max: widths[widths.length - 1] ?? 0
    },
    withinCap,
    withinCapPercent: Math.round((withinCap / Math.max(1, baseline.length)) * 100),
    wrapping: { '100%': wrapRate('100%'), '200%': wrapRate('200%') },
    widest: widest.map((c) => ({ text: c.text, widthEm: c.widthEm })),
    perRfc: perSize['100%'].perRfc
  }

  fs.writeFileSync(path.join(outputDir, 'citation-survey.json'), `${JSON.stringify(summary, null, 2)}\n`)

  const md = [
    '<!-- Generated by website/scripts/layout/citation-survey.ts. Do not edit by hand. -->',
    '',
    '# Bracketed reference citations',
    '',
    `Measured at a ${VIEWPORT.width}px viewport against ${origin}, over ${summary.documents} documents.`,
    '',
    `- Citations: **${summary.citations}** (${summary.distinctNames} distinct names)`,
    `- Width: median **${summary.widthEm.median}em**, 90th percentile **${summary.widthEm.p90}em**, widest **${summary.widthEm.max}em**`,
    `- Within the ${WIDTH_CAP_EM}em cap: **${summary.withinCap}** (${summary.withinCapPercent}%)`,
    `- Wrapping at 100% text: **${summary.wrapping['100%'].wrapped} of ${summary.wrapping['100%'].total}** (${summary.wrapping['100%'].percent}%)`,
    `- Wrapping at 200% text: **${summary.wrapping['200%'].wrapped} of ${summary.wrapping['200%'].total}** (${summary.wrapping['200%'].percent}%)`,
    '',
    '## Widest citations',
    '',
    '| Citation | Width |',
    '| --- | --- |',
    ...summary.widest.map((c) => `| \`${c.text}\` | ${c.widthEm}em |`),
    ''
  ].join('\n')
  fs.writeFileSync(path.join(outputDir, 'citation-survey.md'), md)

  console.log(`[citation-survey] wrote ${path.join(outputDir, 'citation-survey.md')}`)
}

await main()
