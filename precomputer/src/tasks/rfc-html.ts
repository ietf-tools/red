import path from 'path'
import fsPromises from 'fs/promises'
import { DateTime } from 'luxon'
import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { parse, type SFCDescriptor } from '@vue/compiler-sfc'
import {
  getDOMParser,
  getParentElementNodeNames,
  isHtmlElement,
  isTextNode,
  rfcDocumentToPojo
} from '../utilities/dom.ts'
import {
  type RfcCommon,
  type RfcBucketHtmlDocument,
  type MaxPreformattedLineLengthSchemaType,
  type DocumentHtmlType,
  type TableOfContents,
  type ErrataList,
  RfcBucketHtmlDocumentSchema
} from '../../../website/app/utilities/rfc-validators.ts'
import { extractHrefRfcPart } from '../utilities/rfc.ts'
import { assertNever } from '../utilities/typescript.ts'
import { PUBLIC_SITE_URL_ORIGIN } from '../utilities/url.ts'
import { getPlaintextMaxLineLength, getPlaintextRfcDocument, parsePlaintextBody } from './rfc-html-plaintext.ts'
import { getXml2RfcMaxLineLength, getXml2RfcRfcDocument, parseXml2RfcBody } from './rfc-html-xml2rfc.ts'
import { chunkString, getAllIndexes } from '../utilities/string.ts'
import { textWidthEm, type TextStyle } from '../utilities/font-metrics.ts'
import { validateDocument } from '../utilities/validate-zod.ts'
import { getFromS3, rfcBucketHtmlPathBuilder } from '../utilities/s3.ts'
import { redactRfc } from './rfc.ts'
import { renderHtmlToImage } from '../utilities/html-screenshot.ts'
import { OPENGRAPH_IMAGE_DIMENSIONS, sanitiseHtml } from '../utilities/html.ts'
import { getRfcCommonCached } from '../utilities/api.ts'
import sharp from 'sharp'

type Props = {
  rfcBucketHtml: string
  rfcNumber: number
  getRfcCommon: (rfcNumber: number) => Promise<RfcCommon | null>
  getErrataList: (rfcNumber: number) => Promise<ErrataList>
}

export const rfcBucketHtmlToRfcDocument = async ({
  rfcBucketHtml,
  rfcNumber,
  getRfcCommon,
  getErrataList
}: Props): Promise<RfcBucketHtmlDocument | null> => {
  const parser = await getDOMParser()
  const dom = parser.parseFromString(rfcBucketHtml, 'text/html')

  let rfc = await getRfcCommon(rfcNumber)
  if (rfc === null) {
    return null
  }

  rfc = redactRfc(rfc)

  const rfcAndToc: RfcAndToc = {
    rfc,
    tableOfContents: undefined
  }

  const documentHtmlType = sniffRfcBucketHtmlType(dom)

  let maxPreformattedLineLength: MaxPreformattedLineLengthSchemaType = {
    max: 80
  }

  let rfcDocument: Node[] = []

  switch (documentHtmlType) {
    case 'plaintext':
      parsePlaintextBody(dom.body, rfcAndToc)
      rfcDocument = getPlaintextRfcDocument(dom)
      maxPreformattedLineLength = await getPlaintextMaxLineLength(dom)
      break
    case 'xml2rfc':
      parseXml2RfcBody(dom.body, rfcAndToc)
      rfcDocument = getXml2RfcRfcDocument(dom)
      maxPreformattedLineLength = await getXml2RfcMaxLineLength(dom)
      break
    case 'pdf-or-ps':
      throw Error(`RFC HTML should never be detected as ${documentHtmlType}`)
    default:
      assertNever(documentHtmlType)
      break
  }

  // the HTML was written assuming it will be published to this URL.
  // so relative links are relative to this URL.

  const baseUrl = new URL(
    `/rfc/rfc${rfcNumber}.html`,
    PUBLIC_SITE_URL_ORIGIN // This should not change per-environment.
  )

  convertHrefs(rfcDocument, baseUrl, rfcNumber)
  moveDefinitionIndentToCustomProperty(rfcDocument)
  markReferenceCitations(rfcDocument)
  ensureWordBreaks(rfcDocument)

  const errataList = await getErrataList(rfcNumber)

  const response: RfcBucketHtmlDocument = {
    rfc: rfcAndToc.rfc,
    tableOfContents: rfcAndToc.tableOfContents,
    documentHtmlType,
    documentHtmlObj: rfcDocumentToPojo(rfcDocument),
    maxPreformattedLineLength,
    errataList: errataList.length > 0 ? errataList : undefined,
    timestampIso: DateTime.now().toUTC().toISO()
  }

  validateDocument(response, RfcBucketHtmlDocumentSchema)

  return response
}

export const fetchSourceRfcHtml = async (rfcNumber: number, getRfcHtml: typeof getFromS3): Promise<string | null> => {
  const key = rfcBucketHtmlPathBuilder(rfcNumber)
  const dirtyHtml = await getRfcHtml('S3_RFC_BUCKET', key, 'default', `RFC ${rfcNumber}`)
  if (!dirtyHtml) {
    console.warn(`[RFC ${rfcNumber}] HTML from ${JSON.stringify(key)} not available`)
    return null
  }
  const decoder = new TextDecoder()
  const dirtyHtmlString: string = dirtyHtml instanceof Uint8Array ? decoder.decode(dirtyHtml) : dirtyHtml

  // Sanitise HTML before returning it
  return sanitiseHtml(dirtyHtmlString, 'rfc-html')
}

export type RfcAndToc = {
  rfc: RfcCommon
  tableOfContents?: TableOfContents
}

export const rfcBucketHtmlFilenameBuilder = (rfcNumber: number) => `rfc${rfcNumber}-html.json`

const sniffRfcBucketHtmlType = (dom: Document): DocumentHtmlType => {
  const isPlaintext = dom.querySelector('body > pre')
  const generator = dom.querySelector('meta[name=generator]')

  if (generator) {
    const content = generator.getAttribute('content')
    if (content?.startsWith('xml2rfc')) {
      return 'xml2rfc'
    }
  }

  if (isPlaintext) {
    return 'plaintext'
  }

  throw Error('Unable to sniff RFC HTML type. Please report this error.')
}

/**
 * Rewrites link `href`s in place (mutating the given Nodes) so that RFC links keep the
 * reader within the '/info/*' route.
 *
 * 1) Relative hrefs such as `./rfcN.html` resolve against the page path, so from
 *    `/info/rfcN/` they would point somewhere other than from `/rfc/rfcN.html`. They are
 *    resolved against `/rfc/` (the second argument of URL()), which leaves them relative
 *    to the domain rather than the path.
 * 2) Absolute hrefs of `https://www.rfc-editor.org/ANYTHING` become `/ANYTHING`, so links
 *    hardcoded to prod also work on localhost, staging etc.
 * 3) Hrefs to '/rfc/rfcN.html' become '/info/rfcN/'. The '/rfc/*' HTML is not served by the
 *    Nuxt routes, so following such a link would leave the responsive, accessible '/info/*'
 *    UI; the original HTML remains available for those who prefer it.
 **/
const convertHrefs = (rfcDocument: Node[], baseUrl: URL, rfcNumberForDebug: number): void => {
  const publicSiteUrl = new URL(PUBLIC_SITE_URL_ORIGIN)

  const httpUrl = new URL('http://example.com/')
  const httpsUrl = new URL('https://example.com/')

  const safeParseUrl = (href: string, baseUrl: URL | string, rfcNumberForDebug: number): URL | null => {
    const isInvalidUrl = (error: unknown): boolean => {
      return Boolean(error && typeof error === 'object' && 'code' in error && error.code === 'ERR_INVALID_URL')
    }

    try {
      // URL() will throw `ERR_INVALID_URL` error if the protocol is different
      // between `href` and `baseUrl` so some errors are to be expected.
      // Eg parsing `http:...` or `ftp:` with a baseUrl of `https://...`
      return new URL(href, baseUrl)
    } catch (error) {
      if (isInvalidUrl(error)) {
        try {
          // Try to parse `href` without `baseUrl` because perhaps the protocol is different
          return new URL(href)
        } catch (error2) {
          return null
        }
      }
      return null
    }
  }

  const walk = (node: Node): void => {
    if (isHtmlElement(node)) {
      if (node.nodeName.toLowerCase() === 'a') {
        const originalHref = node.getAttribute('href')
        let href = node.getAttribute('href')
        if (
          href &&
          // don't convert hrefs that at are just internal links, but do convert
          // eg './rfcN.html#section' or './rfcN' etc
          !href.startsWith('#')
        ) {
          const url = safeParseUrl(href, baseUrl, rfcNumberForDebug)

          if (url) {
            if ([httpUrl.protocol, httpsUrl.protocol].includes(url.protocol) && url.host === publicSiteUrl.host) {
              // see (1) and (2) above
              href = `${url.pathname}${url.search}${url.hash}`
            }

            if (href.startsWith('/rfc/') && !href.endsWith('.pdf')) {
              const rfcPart = extractHrefRfcPart(href)
              if (rfcPart) {
                // see (3) above
                href = `/info/${rfcPart}/${url.search}${url.hash}`
              }
            }

            if (href !== originalHref) {
              node.setAttribute('href', href)
            }
          } else {
            console.info(
              `[RFC ${rfcNumberForDebug}] Failed to parse URL ${JSON.stringify(href)} so this href won't be converted (made relative).`
            )
          }
        }
      }
      Array.from(node.childNodes).forEach(walk)
    }
  }
  return rfcDocument.forEach(walk)
}

/**
 * Word width ceilings in em. A word is labelled with the first ceiling it fits inside, and the site
 * hides its breaks once the containing block is at least that wide — so what has to fit is the
 * ceiling, not the measured width, and suppression can never cause an overflow.
 */
const WORD_SIZE_GROUPINGS_EM = [4, 6, 8, 10, 12, 16, 24]

/**
 * Absorbs the error in summing per-character advances rather than measuring a whole word. Kerning
 * and ligatures narrow text so the sum usually runs wide, but subpixel rounding can make it run
 * short; measured worst case is 3.9%.
 */
const WIDTH_ESTIMATE_ERROR_FACTOR = 1.05

/** Wider than the largest grouping: the word keeps its breaks at every container width. */
const WORD_SIZE_WIDE_CLASS = 'wordsize-wide'

/** Elements whose text is not rendered in the body font, so a body-metric estimate would be wrong. */
const MONOSPACE_CONTEXTS = ['code', 'tt', 'kbd', 'samp']
const BOLD_CONTEXTS = ['strong', 'b', 'th', 'dt', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']

const textStyleForContext = (parents: string[]): TextStyle => {
  if (parents.some((name) => MONOSPACE_CONTEXTS.includes(name))) {
    return 'monospace'
  }
  return parents.some((name) => BOLD_CONTEXTS.includes(name)) ? 'bold' : 'body'
}

/**
 * The class naming how much room a word needs, so CSS can switch its breaks off where there is
 * enough. Prefixed `wordsize-` rather than `w-` because Tailwind is loaded on these pages and
 * would otherwise apply a width to the element.
 */
const wordSizeClass = (word: string, style: TextStyle): string => {
  const widthEm = textWidthEm(word, style) * WIDTH_ESTIMATE_ERROR_FACTOR
  const groupingEm = WORD_SIZE_GROUPINGS_EM.find((ceilingEm) => widthEm <= ceilingEm)
  return groupingEm === undefined ? WORD_SIZE_WIDE_CLASS : `wordsize-${groupingEm}`
}

/** Class marking a reference citation, so CSS can hold it on one line where it fits. */
const REFERENCE_CITATION_CLASS = 'reference-citation'

/** Contexts where a citation renders wider than the body table describes, so it is left alone. */
const WIDER_THAN_BODY = ['strong', 'b', 'th', 'dt', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']

/**
 * Marks reference citations — `[RFC3629]`, `[OAM-CONS]` — so CSS can hold them on one line. Without
 * it browsers split `[QUIC-INVARIANTS]` at its hyphen, which reads as a typo.
 *
 * RFC 7322 separates the two terms: a *citation* is the square-bracketed tag in the running text,
 * and a *reference* is the matching entry in the References section. What is marked here is the
 * citation, brackets included, so naming it after references would name the wrong element.
 *
 * Each citation also carries the same width class as a broken word, so CSS holds it together only
 * where the containing block is wide enough — keeping a citation whole is safe only while it fits.
 * Width is measured rather than counted: reference labels are uppercase acronyms, and capitals are
 * wide enough that a character count holds citations together that then overflow.
 *
 * Must run before `ensureWordBreaks`, which splits text nodes and would leave the span no longer
 * matching the shape this looks for.
 */
export const markReferenceCitations = (rfcDocument: Node[]): void => {
  const isReferenceCitation = (node: HTMLElement): boolean => {
    if (node.nodeName.toLowerCase() !== 'span') {
      return false
    }
    const children = Array.from(node.childNodes)
    if (children.length !== 3) {
      return false
    }
    const [open, link, close] = children
    return (
      isTextNode(open) &&
      (open.textContent ?? '').endsWith('[') &&
      isHtmlElement(link) &&
      link.nodeName.toLowerCase() === 'a' &&
      isTextNode(close) &&
      (close.textContent ?? '').startsWith(']')
    )
  }

  const walk = (node: Node): void => {
    if (!isHtmlElement(node)) {
      return
    }

    if (isReferenceCitation(node)) {
      const text = node.textContent ?? ''
      const parents = getParentElementNodeNames(node)
      const rendersWider = WIDER_THAN_BODY.some((name) => parents.includes(name))

      if (!rendersWider) {
        const classes = `${REFERENCE_CITATION_CLASS} ${wordSizeClass(text, 'body')}`
        const existingClass = node.getAttribute('class')
        node.setAttribute('class', existingClass ? `${existingClass} ${classes}` : classes)
      }
    }

    Array.from(node.childNodes).forEach(walk)
  }

  rfcDocument.forEach(walk)
}

/** Marks definitions whose hanging indent has moved into a custom property. */
const DEFINITION_INDENT_CLASS = 'dd-ml'

const DEFINITION_INDENT_CUSTOM_PROPERTY = '--dd-ml'

/**
 * Moves the hanging indent xml2rfc puts on each `<dd>` from an inline `margin-left` to a custom
 * property, so the site can decide when to apply it.
 *
 * An inline declaration beats every stylesheet rule regardless of specificity, so without this no
 * `@media` rule can reduce the indent, and on a narrow screen it leaves almost no room for the
 * definition text. The per-list measured value is preserved.
 *
 * Only `margin-left` is moved; other inline declarations are left alone.
 */
export const moveDefinitionIndentToCustomProperty = (rfcDocument: Node[]): void => {
  const walk = (node: Node): void => {
    if (!isHtmlElement(node)) {
      return
    }

    if (node.nodeName.toLowerCase() === 'dd') {
      const style = node.getAttribute('style')

      if (style !== null) {
        const declarations = style
          .split(';')
          .map((declaration) => declaration.trim())
          .filter((declaration) => declaration.length > 0)

        const indent = declarations
          .find((declaration) => declaration.toLowerCase().startsWith('margin-left'))
          ?.split(':')[1]
          ?.trim()

        if (indent !== undefined && indent.length > 0) {
          const remaining = declarations.filter((declaration) => !declaration.toLowerCase().startsWith('margin-left'))

          node.setAttribute('style', [...remaining, `${DEFINITION_INDENT_CUSTOM_PROPERTY}:${indent}`].join(';'))

          const existingClass = node.getAttribute('class')
          node.setAttribute(
            'class',
            existingClass ? `${existingClass} ${DEFINITION_INDENT_CLASS}` : DEFINITION_INDENT_CLASS
          )
        }
      }
    }

    Array.from(node.childNodes).forEach(walk)
  }

  rfcDocument.forEach(walk)
}

/**
 * Splits long words by inserting <wbr> elements.
 *
 * RFC content has long 'words' (eg the text content of URLs) that break mobile layout because
 * they prevent line wrapping. CSS `overflow-wrap: anywhere` mostly works but it causes 'orphan'
 * chars, eg in table headings it will linewrap just the 'n' in 'description'.
 *
 * <wbr> elements work better than unicode approaches (zero-width spaces etc) because, being
 * non-characters, they aren't copied to the clipboard.
 *
 * They also give control over where a line may break, so a 'word' that looks like a URL breaks
 * at meaningful points, eg https://<wbr>domain/<wbr>path1/<wbr>path2?<wbr>query1=1, which is
 * more readable than arbitrary line break points.
 **/
export const ensureWordBreaks = (rfcDocument: Node[]): void => {
  const walk = (node: Node): void => {
    if (isHtmlElement(node)) {
      Array.from(node.childNodes).forEach(walk)
    } else if (isTextNode(node)) {
      const { parentElement, textContent } = node
      if (parentElement === null || textContent === null) {
        return
      }

      const parents = getParentElementNodeNames(parentElement)
      if (parents.includes('pre') || parents.includes('svg')) {
        return
      }

      const wordIndexes = getAllIndexes(textContent, /[\s\n]/g)
      wordIndexes.sort((a, b) => a - b)

      const words = []
      words.push(
        ...wordIndexes.map((strIndex, arrIndex) => {
          if (arrIndex === 0) {
            return textContent.substring(0, strIndex)
          }
          return textContent.substring(wordIndexes[arrIndex - 1], strIndex)
        })
      )
      if (wordIndexes.length > 0) {
        const lastIndex = wordIndexes[wordIndexes.length - 1]
        words.push(textContent.substring(lastIndex))
      } else {
        words.push(textContent)
      }

      const WORD_BREAK_ELEMENT = 'wbr'

      // Shortest word worth breaking. Chosen by corpus measurement; `wbr-split-length.ts` in the
      // website scripts re-runs it.
      const WORD_BREAK_TRIGGER_LENGTH = 14

      // A camelCase hump also occurs in surnames ("McManus"), so it only counts once a word is long
      // enough to be an identifier.
      const CAMEL_CASE_MIN_LENGTH = 14

      // How finely a run offering no break of its own is subdivided.
      const MAX_UNBREAKABLE_RUN_LENGTH = 10

      // Never strand a fragment this short on a line of its own.
      const MIN_BREAK_FRAGMENT_LENGTH = 3

      // An underscore always triggers a break, whatever the word's length: prose and proper names
      // have no internal underscores, so nothing else can match. No other separator is safe to
      // trigger on unconditionally — `.`, `?`, `%` and `&` all appear in short prose ("e.g.",
      // "50%", "AT&T").
      const IDENTIFIER_BOUNDARY = /_/

      const CAMEL_CASE = /[a-z][A-Z]/

      // A dotted name (`mail.isp.example`) breaks at its periods however short it is. Both
      // segments must carry a letter and be at least two characters, which keeps section
      // cross-references (`19.15`) and decimals out — breaking those would start a line with `.15`.
      const DOTTED_NAME_SEGMENTS = /[A-Za-z0-9]{2,}\.[A-Za-z0-9]{2,}/
      const DOTTED_NAME_HAS_LETTERS = /[A-Za-z0-9]*[A-Za-z][A-Za-z0-9]*\.[A-Za-z0-9]*[A-Za-z][A-Za-z0-9]*/

      // Both separators are required: a slash alone matches prose (`and/or`, `N/A`, `HTTP/3`),
      // while a dot and a slash together make a path or DOI (`10.17487/RFC9000`).
      const INTERNAL_DOT = /[A-Za-z0-9]\.[A-Za-z0-9]/
      const INTERNAL_SLASH = /[A-Za-z0-9]\/[A-Za-z0-9]/

      const isMachineReadableName = (word: string): boolean =>
        (DOTTED_NAME_SEGMENTS.test(word) && DOTTED_NAME_HAS_LETTERS.test(word)) ||
        (INTERNAL_DOT.test(word) && INTERNAL_SLASH.test(word))

      const textAndWordbreaks = words
        .flatMap((word): Node | Node[] => {
          // Words are sliced at whitespace, so every word but the first carries its leading
          // separator. The gate measures only the visible characters; otherwise the same word
          // breaks differently depending on where in the sentence it sits.
          const leading = /^[\s\n]*/.exec(word)?.[0] ?? ''
          const visible = word.substring(leading.length)

          if (
            visible.length > WORD_BREAK_TRIGGER_LENGTH ||
            IDENTIFIER_BOUNDARY.test(visible) ||
            isMachineReadableName(visible) ||
            (CAMEL_CASE.test(visible) && visible.length >= CAMEL_CASE_MIN_LENGTH)
          ) {
            const visibleParts = chunkString(visible, MAX_UNBREAKABLE_RUN_LENGTH, MIN_BREAK_FRAGMENT_LENGTH)
            const sizeClass = wordSizeClass(visible, textStyleForContext(parents))
            // The leading whitespace belongs to the first fragment: it is text, not a break point.
            const wordParts = visibleParts.map((part, index) => (index === 0 ? `${leading}${part}` : part))
            return wordParts.flatMap((wordPart, i, arr) => {
              if (wordPart.length === 0) {
                return []
              }
              const textNode = node.ownerDocument.createTextNode(wordPart)

              if (i === arr.length - 1) {
                return [textNode]
              }

              const wbrElement = node.ownerDocument.createElement(WORD_BREAK_ELEMENT)
              wbrElement.setAttribute('class', sizeClass)

              return [textNode, wbrElement]
            })
          }
          return node.ownerDocument.createTextNode(word)
        })
        .reduce((acc, node) => {
          const lastNode = acc[acc.length - 1]

          if (isTextNode(node)) {
            const { textContent } = node
            if (textContent && textContent.length > 0) {
              if (isTextNode(lastNode)) {
                // merge adjacent text nodes if possible
                // because after splitting on words
                // there will be a lot of contiguous
                // text nodes
                lastNode.textContent = `${lastNode.textContent ?? ''}${textContent}`
              } else {
                acc.push(node)
              }
            }
          } else {
            acc.push(node)
          }

          return acc
        }, [] as Node[])

      const fragment = node.ownerDocument.createDocumentFragment()
      fragment.replaceChildren(...textAndWordbreaks)
      parentElement.replaceChild(fragment, node)
    }
  }

  rfcDocument.forEach(walk)
}

const srcDir = path.resolve(import.meta.dirname, '..')

const rfcMetaScreenshotTemplatePath = path.resolve(srcDir, 'utilities', 'rfc-meta-screenshot.vue')

const metaThumbnailRfcNLogoPath = path.resolve(srcDir, 'assets', 'meta-thumbnail-rfcN-logo.svg')

const rfcMetaScreenshotTemplate = fsPromises.readFile(rfcMetaScreenshotTemplatePath, 'utf-8')

let sfcDescriptorCache: SFCDescriptor | undefined = undefined

const logoBase64UriPromise = new Promise<string>((resolve, reject) => {
  const bgBlue = '#002d3c'
  const paddingPx = 50
  const logoWidthPx = 600
  const canvasWidthPx = 2000
  fsPromises.readFile(metaThumbnailRfcNLogoPath, 'utf-8').then((svgString) =>
    sharp(Buffer.from(svgString))
      .resize(logoWidthPx) // render logo at logo size
      // extend canvas so that logo takes less than half the width of the graphic
      .extend({
        top: paddingPx,
        right: canvasWidthPx - logoWidthPx + paddingPx,
        bottom: paddingPx,
        left: paddingPx,
        background: bgBlue
      })
      .flatten({
        background: bgBlue
      })
      .withMetadata({ density: 300 })
      .toBuffer()
      .then((buffer) => {
        resolve(`data:image/png;base64,${buffer.toString('base64')}`)
      })
  )
})

export const getRfcHtmlMetaScreenshot = async (
  rfcNumber: number,
  getRfcCommon: typeof getRfcCommonCached
): Promise<Buffer | undefined> => {
  const rfc = await getRfcCommon(rfcNumber)
  if (!rfc) {
    return undefined
  }
  if (!sfcDescriptorCache) {
    const templateData = await rfcMetaScreenshotTemplate
    const { descriptor } = parse(templateData)
    sfcDescriptorCache = descriptor
  }
  if (!sfcDescriptorCache || !sfcDescriptorCache.template) {
    throw Error('Unable to load template')
  }
  const vueTemplate = sfcDescriptorCache.template.content
  const logoBase64Uri = await logoBase64UriPromise
  const app = createSSRApp({
    data: () => ({ rfc, logoBase64Uri }),
    template: vueTemplate
  })
  const bodyHtml = await renderToString(app)
  return renderHtmlToImage(bodyHtml, OPENGRAPH_IMAGE_DIMENSIONS)
}
