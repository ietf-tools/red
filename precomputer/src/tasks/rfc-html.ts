import path from 'path'
import fsPromises from 'fs/promises'
import sanitizeHtml from 'sanitize-html'
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
import {
  getPlaintextMaxLineLength,
  getPlaintextRfcDocument,
  parsePlaintextBody
} from './rfc-html-plaintext.ts'
import {
  getXml2RfcMaxLineLength,
  getXml2RfcRfcDocument,
  parseXml2RfcBody
} from './rfc-html-xml2rfc.ts'
import { chunkString, getAllIndexes } from '../utilities/string.ts'
import { validateDocument } from '../utilities/validate-zod.ts'
import { getFromS3, rfcBucketHtmlPathBuilder } from '../utilities/s3.ts'
import { redactRfc } from './rfc.ts'
import { renderHtmlToImage } from '../utilities/html-screenshot.ts'
import { OPENGRAPH_IMAGE_DIMENSIONS } from '../utilities/html.ts'
import { getRfcCommonCached } from '../utilities/api.ts'

export const rfcBucketHtmlToRfcDocument = async (
  rfcBucketHtml: string,
  rfcNumber: number,
  getRfcCommon: (rfcNumber: number) => Promise<RfcCommon | null>,
  getErrataList: (rfcNumber: number) => Promise<ErrataList>
): Promise<RfcBucketHtmlDocument | null> => {
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
    max: 80,
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

  const baseUrl = new URL(`/rfc/rfc${rfcNumber}.html`, PUBLIC_SITE_URL_ORIGIN)

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

export const fetchSourceRfcHtml = async (
  rfcNumber: number,
  getRfcHtml: typeof getFromS3
): Promise<string | null> => {
  const key = rfcBucketHtmlPathBuilder(rfcNumber)
  const dirtyHtml = await getRfcHtml('S3_RFC_BUCKET', key)
  if (!dirtyHtml) {
    console.warn(
      `[RFC ${rfcNumber}] HTML from ${JSON.stringify(key)} not available`
    )
    return null
  }

  const dirtyHtmlString =
    dirtyHtml instanceof Uint8Array ?
      new TextDecoder().decode(dirtyHtml)
      : dirtyHtml

  // Sanitise HTML before returning it

  const SVG_STYLE_ATTRIBUTES = [
    'role',

    'fill',
    'fill-rule',

    'clip-rule',

    'stroke',
    'stroke-width',
    'stroke-linecap',
    'stroke-linejoin',
    'stroke-miterlimit',

    'transform',
    'transform-origin',

    'rotate',

    // Text attributes
    'text-anchor',
    'font-family',
    'font-size',
    'text-anchor'
  ]

  const sanitisedHtml = sanitizeHtml(dirtyHtmlString, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat([
      'html',
      'head',
      'body',
      'meta',
      'title',
      'link',
      'img',
      'svg',
      'g',
      'defs',
      'stop',
      'path',
      'rect',
      'circle',
      'ellipse',
      'polygon',
      'polyline',
      'line',
      'text',
      'tspan',
      'tbreak',
      'textPath',
      'image',
      'use',
      'clipPath',
      'mask',
      'pattern',
      'solidColor',
      'linearGradient',
      'radialGradient',
    ]),
    allowedAttributes: {
      '*': ['id', 'class', 'style', 'dir'],
      a: ['href', 'rel'],
      meta: ['name', 'content'],
      time: ['datetime'],
      td: ['colspan', 'rowspan'],
      th: ['colspan', 'rowspan'],
      ol: ['start', 'type', 'reversed'],
      link: ['rel', 'href'],
      svg: [
        'xmlns',
        'version',
        'width',
        'height',
        'viewBox',
        'preserveAspectRatio',
        ...SVG_STYLE_ATTRIBUTES
      ],
      desc: [...SVG_STYLE_ATTRIBUTES],
      use: [
        'x',
        'y',
        'width',
        'height',
        'href',
        'xlink:href',
        ...SVG_STYLE_ATTRIBUTES
      ],
      g: ['label', ...SVG_STYLE_ATTRIBUTES],
      path: ['d', 'pathLength', ...SVG_STYLE_ATTRIBUTES],
      text: ['x', 'y', ...SVG_STYLE_ATTRIBUTES],
      circle: ['cx', 'cy', 'r', ...SVG_STYLE_ATTRIBUTES],
      ellipse: ['cx', 'cy', 'rx', 'ry', ...SVG_STYLE_ATTRIBUTES],
      textPath: ['href', 'startOffset', ...SVG_STYLE_ATTRIBUTES],
      tspan: ['x', 'y', 'startOffset', ...SVG_STYLE_ATTRIBUTES],
      polygon: ['points', ...SVG_STYLE_ATTRIBUTES],
      polyline: ['points', ...SVG_STYLE_ATTRIBUTES],
      linearGradient: [
        'x1',
        'x2',
        'y1',
        'y2',
        'gradientUnits',
        'spreadMethod',
        ...SVG_STYLE_ATTRIBUTES
      ],
      rect: ['x', 'y', 'width', 'height', 'rx', 'ry', ...SVG_STYLE_ATTRIBUTES],
      radialGradient: [
        'cx',
        'cy',
        'r',
        'fx',
        'fy',
        'fr',
        'gradientUnits',
        'spreadMethod',
        ...SVG_STYLE_ATTRIBUTES
      ]
    },
    allowedSchemes: [
      'data',
      'http',
      'https',
      'tel',
      'ftp',
      'mailto',
      'urn' // eg RFC9000 has <link rel="alternate" href="urn:issn:2070-1721">
    ],
    parser: {
      lowerCaseTags: false,
      lowerCaseAttributeNames: false
    }
  })
  return sanitisedHtml
}

export type RfcAndToc = {
  rfc: RfcCommon
  tableOfContents?: TableOfContents
}

export const rfcBucketHtmlFilenameBuilder = (rfcNumber: number) =>
  `rfc${rfcNumber}-html.json`

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
const convertHrefs = (
  rfcDocument: Node[],
  baseUrl: URL,
  rfcNumberForDebug: number
): void => {
  const publicSiteUrl = new URL(PUBLIC_SITE_URL_ORIGIN)

  const httpUrl = new URL('http://example.com/')
  const httpsUrl = new URL('https://example.com/')

  const safeParseUrl = (
    href: string,
    baseUrl: URL | string,
    rfcNumberForDebug: number
  ): URL | null => {
    const isInvalidUrl = (error: unknown): boolean => {
      return Boolean(
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'ERR_INVALID_URL'
      )
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
            if (
              [httpUrl.protocol, httpsUrl.protocol].includes(url.protocol) &&
              url.host === publicSiteUrl.host
            ) {
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
            console.warn(
              `[RFC ${rfcNumberForDebug}] Info: failed to parse URL ${JSON.stringify(href)} so this href won't be converted (made relative).`
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

      const wordIndexes = getAllIndexes(textContent, /[\s]/g)
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

      const textAndWordbreaks = words
        .flatMap((word): Node | Node[] => {
          if (word.length > REQUIRE_WORDBREAK_AFTER_CHARS_LENGTH) {
            const wordParts = chunkString(
              word,
              REQUIRE_WORDBREAK_AFTER_CHARS_LENGTH
            )
            return wordParts.flatMap((wordPart) => {
              if (wordPart.length === 0) {
                return []
              }

              return [
                node.ownerDocument.createTextNode(wordPart),
                node.ownerDocument.createElement(
                  // https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/wbr
                  WORD_BREAK_ELEMENT
                )
              ]
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
                lastNode.textContent = `${lastNode.textContent ?? ''
                  }${textContent}`
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


const rfcMetaScreenshotTemplatePath = path.resolve(import.meta.dirname, '..', 'utilities', 'rfc-meta-screenshot.vue')

const rfcMetaScreenshotTemplate = fsPromises.readFile(rfcMetaScreenshotTemplatePath, 'utf-8')

let sfcDescriptorCache: SFCDescriptor | undefined = undefined

export const getRfcHtmlMetaScreenshot = async (rfcNumber: number, getRfcCommon: typeof getRfcCommonCached): Promise<Buffer | undefined> => {
  const rfc = await getRfcCommon(rfcNumber)
  if (rfc) {
    if (!sfcDescriptorCache) {
      const templateData = await rfcMetaScreenshotTemplate
      const { descriptor } = parse(templateData)
      sfcDescriptorCache = descriptor
    }
    if (!sfcDescriptorCache || !sfcDescriptorCache.template) {
      throw Error('Unable to load template')
    }
    const vueTemplate = sfcDescriptorCache.template.content
    const app = createSSRApp({
      data: () => ({ rfc }),
      template: vueTemplate
    })
    const bodyHtml = await renderToString(app)
    return renderHtmlToImage(bodyHtml, OPENGRAPH_IMAGE_DIMENSIONS)
  }
  return undefined
}