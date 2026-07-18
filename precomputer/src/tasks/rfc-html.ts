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
 * This function converts link `href`s by changing (mutating) the given Nodes, by
 * changing attribute `href` values.
 *
 * 1) Many RFCs have relative hrefs of `./rfcN.html` which resolves differently from
 *    a page at `/rfc/rfcN.html` and the new republished path of `/info/rfcN/`
 *    (regardless of the trailing slash, the `/info/` will make relative hrefs resolve
 *    differently). Converting the hrefs is very simple as the web standard URL() takes
 *    a 2nd arg to resolve relative links against, so this function resolves relative
 *    paths from `./rfcN.html` to `/rfc/rfcN.html`. So they're still relative hrefs but
 *    they're relative to the domain, not the path.
 * 2) Many RFCs have absolute hrefs of `https://www.rfc-editor.org/ANYTHING` so
 *    when they hardcode links to prod we'll we'll convert those to `/ANYTHING`. This
 *    also makes these links work relatively on localhost/staging etc.
 * 3) Many RFCs have links to '/rfc/rfcN.html', so —when browsing from '/info/*'—
 *    users would keep leaving the '/info/*' route and instead browse '/rfc/*' HTML.
 *    The '/rfc/*' routes are not part of the Nuxt routes with the new UI.
 *    So there is a high-level question of whether users should be able to follow RFC
 *    link after RFC link while staying within the Nuxt '/info/*' route’s UI/UX, or
 *    whether we should maintain the original `href` string as-is, or interpret hrefs
 *    to RFCs as something we can use to link to 'info' RFCs.
 *
 *    The original '/rfc/*' HTML is still available for those who prefer it. That's not
 *    being taken away.
 *
 *    The 'info' route is a ~*NEW*~ UI for browsing RFC content that tries to make
 *    documents more usable by providing a responsive and accessible UI (more zoomable),
 *    with ToC, etc. It's believed that preserving `href`s as-is would would limit users.
 *    So it's been decided to change the `href`s to encourage users to read RFC content
 *    within the '/info/*' route, as if it were a mirror of RFC content, and users can
 *    always browse the original HTML if they wish.
 *
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

            // console.log(
            //   `[RFC ${rfcNumberForDebug}] replace href?`,
            //   JSON.stringify(originalHref),
            //   JSON.stringify(href)
            // )

            if (href !== originalHref) {
              // console.log(
              //   ' - replace href',
              //   JSON.stringify(originalHref),
              //   JSON.stringify(href)
              // )
              node.setAttribute('href', href)
            } else {
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
 * This function splits long words and inserts <wbr> elements
 *
 * RFC content has long 'words' (ie, text content of URLs as text nodes) that break mobile layout
 * because they prevent line wrapping. Using CSS `overflow-wrap: anywhere` mostly worked but it
 * caused 'orphan' chars eg in table headings it'll linewrap just the 'n' in 'description'.
 *
 * This function has a new approach where it inserts <wbr> elements. These <wbr> elements seem to
 * work better than unicode approaches (zero-width spaces etc) because being non-characters they
 * aren't copied to the clipboard.
 *
 * This also means we can control potential line breaks so if the 'word' looks like a URL we can
 * insert <wbr> at appropriate points, eg https://<wbr>domain/<wbr>path1/<wbr>path2?<wbr>query1=1
 * etc which is more readable than artitrary line break points.
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

      const REQUIRE_WORDBREAK_AFTER_CHARS_LENGTH = 16
      const WORD_BREAK_ELEMENT = 'wbr'

      // A word containing an underscore is treated as an identifier and always
      // gets <wbr>s regardless of length, so names like `qualifier_set`,
      // `valid_policy` and `parent_nodes` can wrap even in deeply-indented /
      // narrow (~320px) contexts. An underscore is an unambiguous identifier
      // signal: prose and proper names don't contain internal underscores, so
      // ordinary text (incl. trailing punctuation like `document.`) is untouched.
      //
      // Underscore is the only split char safe to trigger on regardless of
      // length. Deliberately excluded from the always-break trigger:
      //  - `.` `?` `%` `&`: common in short prose ("e.g.", "50%", "AT&T") —
      //    always-breaking would orphan trailing punctuation.
      //  - `/` `:` `=` `@` `\`: in practice only inside already-long strings
      //    (URLs, paths, emails) that the length gate already catches.
      //  - `-` (hyphen): split *before* the char (unlike underscore's after-
      //    placement, ietf-tools/red#424), so revisit placement before adding.
      const IDENTIFIER_BOUNDARY = /_/

      // A camelCase hump also marks a code identifier (`exclusiveMaximum`,
      // `AddressComponent`), but it occurs in surnames too (e.g. "McManus"), so
      // it only triggers a break once the word is long enough to be an
      // identifier rather than a name. Hyphenated names like "Delignat-Lavaud"
      // have no camelCase hump, so they are left intact. This length floor is
      // what lets exactly-16-char code identifiers break without the main gate
      // having to be lowered (which would catch 16-char hyphenated names).
      const CAMEL_CASE = /[a-z][A-Z]/
      const CAMEL_CASE_MIN_LENGTH = REQUIRE_WORDBREAK_AFTER_CHARS_LENGTH

      const textAndWordbreaks = words
        .flatMap((word): Node | Node[] => {
          if (
            word.length > REQUIRE_WORDBREAK_AFTER_CHARS_LENGTH ||
            IDENTIFIER_BOUNDARY.test(word) ||
            (CAMEL_CASE.test(word) && word.length >= CAMEL_CASE_MIN_LENGTH)
          ) {
            const wordParts = chunkString(word, REQUIRE_WORDBREAK_AFTER_CHARS_LENGTH)
            return wordParts.flatMap((wordPart, i, arr) => {
              if (wordPart.length === 0) {
                return []
              }
              const textNode = node.ownerDocument.createTextNode(wordPart)

              if (i === arr.length - 1) {
                return [textNode]
              }

              const wbrElement = node.ownerDocument.createElement(
                // https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/wbr
                WORD_BREAK_ELEMENT
              )

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
      // render logo at logo size
      .resize(logoWidthPx)
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
