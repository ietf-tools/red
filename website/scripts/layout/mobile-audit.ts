/**
 * Audits RFC pages for content that stretches the page horizontally on a narrow screen.
 *
 * The reference-indent fix removed the dominant source of narrow-screen overflow (see
 * the reference indent fix), which is expected to expose smaller ones previously
 * hidden behind it. This finds and classifies what is left.
 *
 * For each element whose right edge crosses the viewport, the deepest such element is taken — an
 * overflowing element pushes all of its ancestors out too, so only the innermost is the culprit —
 * and a cause is inferred from its computed style and geometry. Results are aggregated by
 * signature so the output is a ranked list of distinct problems rather than thousands of instances.
 *
 * Artwork (`pre`, `svg`) and anything inside a deliberate horizontal scroller is ignored: those are
 * allowed to be wider than the screen by design.
 *
 * Word-wrapping causes are reported separately from template ones: a too-wide word is fixed in the
 * precomputer's break rules, not in the stylesheet, and mixing the two buries the layout problems.
 *
 * Pass `--origin` to audit a dev server rather than prod, which is the only way to see unreleased
 * CSS. Note an element crossing the viewport is not necessarily what makes the page wide — confirm a
 * cause by removing it and re-measuring before believing it.
 *
 * Document selection comes from rfc-samples.ts, shared by every script here:
 *
 *   (no flags)                 the curated complex-layout set
 *   --from=9700 --to=9900      a range, e.g. RFCs published since this was last run
 *   --rfcs=9000,9110           specific documents
 *
 * Add --origin=http://localhost:3000 to audit unreleased CSS.
 */
import fs from 'node:fs'
import path from 'node:path'
import { chromium, type Browser, type Page } from 'playwright'
import { noteForRfc, selectRfcs } from '../rfc-samples.ts'

const DEFAULT_ORIGIN = 'https://www.rfc-editor.org'

/** Where the pages come from: prod for published behaviour, a dev server for unreleased CSS. */
const origin = process.argv.find((arg) => arg.startsWith('--origin='))?.split('=')[1] ?? DEFAULT_ORIGIN

const VIEWPORT_WIDTH = 320

const ROOT_FONT_SIZES_PX = [16, 32]

const outputDir = path.resolve(import.meta.dirname, '..', '..', '..', 'docs', 'mobile-layout', 'data')

type Offender = {
  signature: string
  cause: string
  tag: string
  identifier: string
  overflowPx: number
  elementWidthPx: number
  parentAvailablePx: number
  detail: string
  snippet: string
  anchorId: string
}

type PageAudit = {
  rfc: number
  rootFontSizePx: number
  documentOverflowPx: number
  offenders: Offender[]
}

const auditInPage = ({ extraCss }: { extraCss: string }) => {
  const style = document.createElement('style')
  style.textContent = extraCss
  document.head.append(style)

  const viewportWidth = document.documentElement.clientWidth

  /**
   * Any element that does not let its content escape: a scroller, or one that clips. Content inside
   * either cannot make the page wider, so its excess is not a defect. `hidden` matters as much as
   * `auto`, because the visually-hidden `sr-only` pattern is a 1px box clipping a whole sentence,
   * which otherwise reports thousands of pixels of "overflow".
   */
  const isScroller = (el: Element): boolean => {
    const { overflowX } = getComputedStyle(el)
    return overflowX === 'auto' || overflowX === 'scroll' || overflowX === 'hidden' || overflowX === 'clip'
  }

  /**
   * Content is exempt when it is allowed to be wider than the screen: artwork, anything inside a
   * horizontal scroller, and the scroller itself — a scroll container having `scrollWidth >
   * clientWidth` is what scrolling is, not a defect. Checking only ancestors, as this once did,
   * reports a scroller as a 1,000px overflow and reports containers whose excess comes entirely
   * from a scrolling descendant.
   */
  const isExempt = (el: Element): boolean => {
    if (isScroller(el)) {
      return true
    }
    let current: Element | null = el
    while (current && current !== document.documentElement) {
      const tag = current.tagName.toLowerCase()
      if (tag === 'pre' || tag === 'svg' || isScroller(current)) {
        return true
      }
      current = current.parentElement
    }
    // A container whose only over-wide descendant is a scroller is reporting that scroller's
    // content, not a problem of its own.
    return Array.from(el.querySelectorAll('*')).some(
      (descendant) => isScroller(descendant) && descendant.scrollWidth > descendant.clientWidth + 1
    )
  }

  const crossesViewport = (el: Element): boolean => el.getBoundingClientRect().right > viewportWidth + 1

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

  const identifierOf = (el: Element): string => {
    const classes = Array.from(el.classList).slice(0, 2).join('.')
    return `${el.tagName.toLowerCase()}${classes ? `.${classes}` : ''}`
  }

  /** Widest single unbreakable run of text directly inside the element. */
  const widestWordPx = (el: Element): number => {
    const ruler = document.createElement('span')
    ruler.style.cssText = 'position:absolute;left:-99999px;top:0;white-space:pre;visibility:hidden'
    el.append(ruler)
    let widest = 0
    Array.from(el.childNodes)
      .filter((node) => node.nodeType === Node.TEXT_NODE)
      .forEach((node) => {
        ;(node.textContent ?? '')
          .split(/\s+/)
          .filter(Boolean)
          .forEach((word) => {
            ruler.textContent = word
            widest = Math.max(widest, ruler.getBoundingClientRect().width)
          })
      })
    ruler.remove()
    return widest
  }

  const parentAvailableWidthOf = (el: Element): number => {
    const parent = el.parentElement
    if (!parent) {
      return viewportWidth
    }
    const { paddingLeft, paddingRight } = getComputedStyle(parent)
    return parent.clientWidth - parseFloat(paddingLeft) - parseFloat(paddingRight)
  }

  // Order matters: the first matching explanation is reported, most specific first.
  const causeOf = (el: Element): { cause: string; detail: string } => {
    const styles = getComputedStyle(el)
    const rect = el.getBoundingClientRect()
    const tag = el.tagName.toLowerCase()
    const available = parentAvailableWidthOf(el)

    if (styles.whiteSpace === 'nowrap' || styles.whiteSpace === 'pre') {
      return { cause: 'white-space prevents wrapping', detail: `white-space: ${styles.whiteSpace}` }
    }
    const minWidth = parseFloat(styles.minWidth)
    if (Number.isFinite(minWidth) && minWidth > available) {
      return { cause: 'min-width exceeds available width', detail: `min-width: ${styles.minWidth}` }
    }
    if (styles.width.endsWith('px') && parseFloat(styles.width) > available + 1 && styles.boxSizing !== 'border-box') {
      return { cause: 'fixed width exceeds available width', detail: `width: ${styles.width}` }
    }
    const marginLeft = parseFloat(styles.marginLeft)
    const paddingLeft = parseFloat(styles.paddingLeft)
    const indent = (Number.isFinite(marginLeft) ? marginLeft : 0) + (Number.isFinite(paddingLeft) ? paddingLeft : 0)
    if (indent > available / 2) {
      return {
        cause: 'indentation consumes over half the available width',
        detail: `margin-left: ${styles.marginLeft}, padding-left: ${styles.paddingLeft}`
      }
    }
    if (tag === 'table' || tag === 'td' || tag === 'th') {
      return { cause: 'table cannot shrink to fit', detail: `table-layout: ${styles.tableLayout}` }
    }
    if (tag === 'img') {
      return { cause: 'image wider than container', detail: `max-width: ${styles.maxWidth}` }
    }
    const widestWord = widestWordPx(el)
    if (widestWord > available + 1) {
      return {
        cause: 'unbreakable text run',
        detail: `widest word ${Math.round(widestWord)}px in ${Math.round(available)}px`
      }
    }
    if (rect.width > available + 1) {
      return { cause: 'box wider than parent for another reason', detail: `display: ${styles.display}` }
    }
    return {
      cause: 'positioned or shifted outside parent',
      detail: `position: ${styles.position}, float: ${styles.float}`
    }
  }

  // A zero-sized box can report a right edge past the viewport without occupying any width, so it
  // cannot be what stretches the page.
  const hasLayoutFootprint = (el: Element): boolean => {
    const { width, height } = el.getBoundingClientRect()
    return width > 0 && height > 0
  }

  const candidates = Array.from(document.body.querySelectorAll('*')).filter(
    (el) => crossesViewport(el) && hasLayoutFootprint(el) && !isExempt(el)
  )

  const deepest = candidates.filter((el) => !candidates.some((other) => other !== el && el.contains(other)))

  const offenders = deepest.map((el) => {
    const rect = el.getBoundingClientRect()
    const { cause, detail } = causeOf(el)
    const identifier = identifierOf(el)
    return {
      signature: `${identifier} — ${cause}`,
      cause,
      tag: el.tagName.toLowerCase(),
      identifier,
      overflowPx: Math.round(rect.right - viewportWidth),
      elementWidthPx: Math.round(rect.width),
      parentAvailablePx: Math.round(parentAvailableWidthOf(el)),
      detail,
      snippet: (el.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 60),
      anchorId: anchorIdOf(el)
    }
  })

  style.remove()

  return {
    documentOverflowPx: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
    offenders
  }
}

const auditRfc = async (page: Page, rfc: number, rootFontSizePx: number) => {
  await page.setViewportSize({ width: VIEWPORT_WIDTH, height: 900 })
  await page.goto(`${origin}/info/rfc${rfc}/`, { waitUntil: 'networkidle', timeout: 120_000 })
  await page.addStyleTag({ content: `html { font-size: ${rootFontSizePx}px }` })
  return page.evaluate(auditInPage, { extraCss: '' })
}

const main = async () => {
  const { rfcs, selection } = await selectRfcs()

  console.log(`[mobile-audit] ${selection}, ${rfcs.length} documents, width ${VIEWPORT_WIDTH}px`)

  let browser: Browser | undefined
  const audits: PageAudit[] = []
  const failures: { rfc: number; error: string }[] = []

  try {
    browser = await chromium.launch()
    const page = await (await browser.newContext()).newPage()

    for (const rfc of rfcs) {
      for (const rootFontSizePx of ROOT_FONT_SIZES_PX) {
        try {
          const { documentOverflowPx, offenders } = await auditRfc(page, rfc, rootFontSizePx)
          audits.push({ rfc, rootFontSizePx, documentOverflowPx, offenders })
        } catch (error: unknown) {
          failures.push({ rfc, error: String(error).slice(0, 160) })
        }
      }
      const note = noteForRfc(rfc)
      console.log(`[mobile-audit] rfc${rfc} done${note ? ` — ${note}` : ''}`)
    }
  } finally {
    await browser?.close()
  }

  type Grouped = {
    signature: string
    cause: string
    instances: number
    documents: Set<number>
    worstOverflowPx: number
    example: Offender & { rfc: number; rootFontSizePx: number }
  }

  const grouped = new Map<string, Grouped>()
  const causeOfSignature = new Map<string, string>()
  audits.forEach(({ rfc, rootFontSizePx, offenders }) => {
    offenders.forEach((offender) => {
      const existing = grouped.get(offender.signature)
      if (existing) {
        existing.instances += 1
        existing.documents.add(rfc)
        if (offender.overflowPx > existing.worstOverflowPx) {
          existing.worstOverflowPx = offender.overflowPx
          existing.example = { ...offender, rfc, rootFontSizePx }
        }
        return
      }
      causeOfSignature.set(offender.signature, offender.cause)
      grouped.set(offender.signature, {
        signature: offender.signature,
        cause: offender.cause,
        instances: 1,
        documents: new Set([rfc]),
        worstOverflowPx: offender.overflowPx,
        example: { ...offender, rfc, rootFontSizePx }
      })
    })
  })

  const TEXT_CAUSE = 'unbreakable text run'

  const byDocumentsThenWorst = (a: Grouped, b: Grouped) =>
    b.documents.size - a.documents.size || b.worstOverflowPx - a.worstOverflowPx

  const ranked = [...grouped.values()].filter(({ cause }) => cause !== TEXT_CAUSE).sort(byDocumentsThenWorst)
  const textRanked = [...grouped.values()].filter(({ cause }) => cause === TEXT_CAUSE).sort(byDocumentsThenWorst)

  const pagesWithOverflow = audits.filter(({ documentOverflowPx }) => documentOverflowPx > 0)

  const lines = [
    '<!-- Generated by website/scripts/layout/mobile-audit.ts. Do not edit by hand. -->',
    '',
    '# Narrow-screen rendering audit',
    '',
    `Viewport ${VIEWPORT_WIDTH}px against ${origin}, at ${ROOT_FONT_SIZES_PX.map(
      (size) => `${Math.round((size / 16) * 100)}%`
    ).join(' and ')} text size. ${new Set(audits.map((audit) => audit.rfc)).size} documents.`,
    '',
    `Page measurements with any horizontal overflow: **${pagesWithOverflow.length} of ${audits.length}**.`,
    '',
    '## Template and layout problems, ranked by how many documents they affect',
    '',
    'Word-wrapping causes are listed separately at the end: those are fixed in the precomputer, not',
    'in the stylesheet.',
    '',
    '| Problem | Documents | Instances | Worst | Example |',
    '| --- | --- | --- | --- | --- |',
    ...ranked.map(({ signature, documents, instances, worstOverflowPx, example }) => {
      const link = `[RFC ${example.rfc}](${origin}/info/rfc${example.rfc}/${
        example.anchorId ? `#${example.anchorId}` : ''
      })`
      return `| ${signature} | ${documents.size} | ${instances} | ${worstOverflowPx}px | ${link} |`
    }),
    '',
    '## Word-wrapping causes (excluded from the ranking above)',
    '',
    '| Problem | Documents | Instances | Worst | Example |',
    '| --- | --- | --- | --- | --- |',
    ...textRanked.map(({ signature, documents, instances, worstOverflowPx, example }) => {
      const link = `[RFC ${example.rfc}](${origin}/info/rfc${example.rfc}/${
        example.anchorId ? `#${example.anchorId}` : ''
      })`
      return `| ${signature} | ${documents.size} | ${instances} | ${worstOverflowPx}px | ${link} |`
    }),
    '',
    '## Detail',
    '',
    ...ranked.flatMap(({ signature, example }) => [
      `### ${signature}`,
      '',
      `- ${example.detail}`,
      `- element ${example.elementWidthPx}px in ${example.parentAvailablePx}px available`,
      `- at ${Math.round((example.rootFontSizePx / 16) * 100)}% text size`,
      example.snippet ? `- text: \`${example.snippet.replaceAll('`', "'")}\`` : '- (no text)',
      ''
    ])
  ]

  fs.mkdirSync(outputDir, { recursive: true })
  const markdownPath = path.join(outputDir, `mobile-audit.md`)
  fs.writeFileSync(markdownPath, lines.join('\n'))
  fs.writeFileSync(
    path.join(outputDir, `mobile-audit.json`),
    JSON.stringify({ generatedAt: new Date().toISOString(), corpus, failures, audits }, null, 2)
  )

  console.log(lines.slice(0, 40).join('\n'))
  console.log(`[mobile-audit] wrote ${markdownPath}`)
  if (failures.length > 0) {
    console.log(`[mobile-audit] ${failures.length} failures`, failures.slice(0, 3))
  }
}

await main()
