import { kebabCase } from 'lodash-es'
import { parseRFCId } from './rfc'
import type { imagePreviewDimensions } from './head'

/**
 * Represents all known href string patterns
 */
export type ValidHrefs =
  | MarkdownValidHrefs // generated global type from types/markdown-valid-hrefs.d.ts
  | `https://${string}` // any external link is treated as valid (even if it might 404 we don't verify further)
  | typeof HOME_PATH
  | typeof RFC_INDEX_XML_PATH
  | typeof RFC_INDEX_ALL_ASCENDING_PATH
  | typeof RFC_INDEX_100_ASCENDING_PATH
  | typeof RFC_INDEX_ALL_DESCENDING_PATH
  | typeof RFC_INDEX_100_DESCENDING_PATH
  | typeof RSS_PATH
  | typeof ATOM_PATH
  | typeof STANDARDS_PATH
  | typeof IN_NOTES_BCP_REF_TXT
  | typeof IN_NOTES_RFC_REF_TXT
  | typeof IN_NOTES_STD_REF_TXT
  | typeof QUEUE_XML_PATH
  | typeof QUEUE_2_XML_PATH
  | typeof REPORTS_CURRENT_QUEUE_STATS_TXT_PATH
  | typeof NEVER_ISSUED_PATH
  | typeof ALL_CLUSTERS_PATH
  | typeof STATUS_CHANGES_PATH
  | (typeof _FIXME_URLS)[number]
  | ReturnType<typeof markdownPathBuilder>
  | ReturnType<typeof searchPathBuilder>
  | ReturnType<typeof mailToBuilder>
  | ReturnType<typeof refsRefTxtPathBuilder>
  | ReturnType<typeof infoRfcPathBuilder>
  | ReturnType<typeof rfcJSONPathBuilder>
  | ReturnType<typeof rfcPathBuilder>
  | ReturnType<typeof materialsTxtBuilder>
  | ReturnType<typeof rfcFormatPathBuilder>
  | ReturnType<typeof rfcCitePathBuilder>
  | ReturnType<typeof wikiDokuPathBuilder>
  | ReturnType<typeof materialsPathBuilder>
  | ReturnType<typeof dashboardPathBuilder>
  | ReturnType<typeof apiRfcBucketDocumentURLBuilder>
  | ReturnType<typeof apiRfcDocRetrievePathBuilder>

export const HOME_PATH = '/'

export const IETF_PRIVACY_STATEMENT_URL =
  'https://www.ietf.org/privacy-statement/'
export const PUBLIC_SITE = 'https://www.rfc-editor.org'
export const DATATRACKER_URL = 'https://datatracker.ietf.org'
export const IETF_URL = 'https://www.ietf.org'
export const IRTF_URL = 'https://www.irtf.org'
export const IAB_URL = 'https://www.iab.org'
export const INTERNET_SOCIETY_URL = 'https://www.internetsociety.org'
export const MATERIALS_URL = 'https://materials.rfc-editor.org'
export const IAD_URL = 'https://iad.rfc-editor.org'
export const DASHBOARD_URL = 'https://dashboard.rfc-editor.org'

export const SEARCH_PATH = '/search/'
export const SEARCH_API_PATH = '/api/search/'

export const RFC_INDEX_XML_PATH = '/rfc-index.xml'
export const RFC_INDEX_ALL_ASCENDING_PATH = '/rfc-index/'
export const RFC_INDEX_100_ASCENDING_PATH = '/rfc-index-100a/'
export const RFC_INDEX_ALL_DESCENDING_PATH = '/rfc-index2/'
export const RFC_INDEX_100_DESCENDING_PATH = '/rfc-index-100d/'
export const REPORTS_CURRENT_QUEUE_STATS_TXT_PATH = '/reports/CurrQstats.txt'

export const STANDARDS_PATH = '/standards/'

export const RSS_PATH = '/rfcrss.xml'
export const ATOM_PATH = '/rfcatom.xml'

export const IN_NOTES_BCP_REF_TXT = '/in-notes/bcp-ref.txt'
export const IN_NOTES_RFC_REF_TXT = '/in-notes/rfc-ref.txt'
export const IN_NOTES_STD_REF_TXT = '/in-notes/std-ref.txt'

export const QUEUE_XML_PATH = '/queue.xml'
export const QUEUE_2_XML_PATH = '/queue2.xml'

export const NEVER_ISSUED_PATH = '/never-issued/'
export const ALL_CLUSTERS_PATH = '/all_clusters/'
export const STATUS_CHANGES_PATH = '/status-changes/'

export const FIXME_IEN_INDEX_PATH = '/ien/ien-index/'
export const FIXME_CONTACT_AT_IETF_PATH = '/contact/at-ietf/'
export const FIXME_REPORTS_SUBPUB_STATS_PATH = '/reports/subpub_stats/'
export const FIXME_RFCS_PER_YEAR_PATH = '/rfcs-per-year/'
export const FIXME_ERRATA_DEFINITIONS_PATH = '/errata-definitions/'
export const FIXME_INNOTES_PRERELEASE_PATH = '/in-notes/prerelease/'

export const API_ROUTES_TO_PRERENDER = [
  REPORTS_CURRENT_QUEUE_STATS_TXT_PATH,
  RFC_INDEX_ALL_ASCENDING_PATH,
  RFC_INDEX_100_ASCENDING_PATH,
  RFC_INDEX_ALL_DESCENDING_PATH,
  RFC_INDEX_100_DESCENDING_PATH,
  QUEUE_XML_PATH,
  QUEUE_2_XML_PATH,
  // IN_NOTES_BCP_REF_TXT, // FIXME reenable when supported
  // IN_NOTES_STD_REF_TXT, // FIXME reenable when supported
  IN_NOTES_RFC_REF_TXT,
  RSS_PATH,
  ATOM_PATH,
  NEVER_ISSUED_PATH // not an API route but has rarely changing API-driven content
] as const

/**
 * URLs to decide upon.
 * Eventually these might be wrong but we'll temporarily add them to VALID_HREFS
 */
const _FIXME_URLS = [
  FIXME_IEN_INDEX_PATH,
  FIXME_CONTACT_AT_IETF_PATH,
  FIXME_REPORTS_SUBPUB_STATS_PATH,
  FIXME_RFCS_PER_YEAR_PATH,
  FIXME_ERRATA_DEFINITIONS_PATH,
  FIXME_INNOTES_PRERELEASE_PATH
] as const

type Status =
  | 'Internet Standard'
  | 'Proposed Standard'
  | 'Draft Standard'
  | 'Best Current Practice'
  | 'Informational'
  | 'Experimental'
  | 'Historic'
  | 'Unknown'

type SearchPathBuilderProps = {
  status: Status[]
}

export const publicSiteUrl = new URL(PUBLIC_SITE)

/**
 * Optionally specify a different URL param name to the searchPathBuilder key
 */
const searchKeyOverride: Record<
  keyof SearchPathBuilderProps,
  string | undefined
> = {
  status: 'status'
}

export const searchPathBuilder = (
  searchParams: Partial<SearchPathBuilderProps>
): `${typeof SEARCH_PATH}${string}` => {
  const hasParams = Object.values(searchParams).join('').trim().length > 0
  return `${SEARCH_PATH}${hasParams ? '?' : ''}${
    hasParams ?
      Object.keys(searchParams)
        .sort() // normalize order
        .map((searchKey) => {
          const typesenseSearchKey =
            searchKeyOverride[searchKey as keyof SearchPathBuilderProps] ??
            searchKey
          const searchValue =
            searchParams[searchKey as keyof SearchPathBuilderProps]

          return searchValue ?
              `${encodeURIComponent(typesenseSearchKey)}=${typeSenseEncodeUriComponent(
                Array.isArray(searchValue) ? searchValue.join(',') : searchValue
              )}`
            : ''
        })
        .filter(Boolean)
        .join('&')
    : ''
  }`
}

export const refsRefTxtPathBuilder = (rfcId: string) => {
  const rfcParts = parseRFCId(rfcId)
  return `/refs/ref${rfcParts.number}.txt` as const
}

export const infoRfcPathBuilder = (rfcId: string) => {
  const rfcParts = parseRFCId(rfcId)
  return `/info/${rfcParts.type.toLowerCase()}${rfcParts.number}/` as const
}

export const rfcJSONPathBuilder = (rfcId: string) => {
  const rfcParts = parseRFCId(rfcId)
  return `/api/v1/rfc/rfc${rfcParts.number}.json` as const
}

/**
 * This is only used for TS to check valid markdown paths.
 * It's just an 'identity function'.
 */
export const markdownPathBuilder = (markdownPath: MarkdownValidHrefs) =>
  markdownPath

export const rfcPathBuilder = (
  rfcId: string,
  sectionHash?: `section-${string}`
) => {
  const rfcParts = parseRFCId(rfcId)
  return `/rfc/${rfcParts.type.toLowerCase()}${rfcParts.number}/${sectionHash ? (`#${sectionHash}` as const) : ''}` as const
}

export const materialsTxtBuilder = (txtFile: `${string}.txt`) => {
  return `/materials/${txtFile}` as const
}

export const rfcCitePathBuilder = (
  rfcId: string,
  format: 'txt' | 'bibTeX' | 'xml'
) => {
  const parsedRfcId = parseRFCId(rfcId)

  switch (format) {
    case 'txt':
      return `/refs/${parsedRfcId.type.toLowerCase()}${parsedRfcId.number}.txt` as const
    case 'xml':
      return `https://bib.ietf.org/public/rfc/bibxml/reference.${parsedRfcId.type.toUpperCase()}.${parsedRfcId.number}.xml` as const
    case 'bibTeX':
      return `https://datatracker.ietf.org/doc/${parsedRfcId.type.toLowerCase()}${parsedRfcId.number}/bibtex/` as const
  }
}

export const rfcFormatPathBuilder = (rfcId: string, format: 'html') => {
  const parsedRfcId = parseRFCId(rfcId)

  switch (format) {
    case 'html':
      return `/rfc/${parsedRfcId.type.toLowerCase()}${parsedRfcId.number}.html` as const
  }
}

export const wikiDokuPathBuilder = (wikiPath: string) => {
  return `/rpc/wiki/doku.php?id=${wikiPath}` as const
}

export const materialsPathBuilder = (materialsPath: string) => {
  return `${MATERIALS_URL}${materialsPath}` as const
}

export const iadReportsPathBuilder = (IADPath: string) => {
  return `${IAD_URL}${IADPath}` as const
}

export const dashboardPathBuilder = (dashboardPath: string) => {
  return `${DASHBOARD_URL}${dashboardPath}` as const
}

export const mailToBuilder = (email: string) => {
  return `mailto:${email}` as const
}

export const apiRfcBucketDocumentURLBuilder = (rfcNumber: number) => {
  // Intentionally not a relative url, the PUBLIC_SITE prefix is because this URL is served
  // from a bucket on prod; it's not something that a localhost Nuxt can serve.
  // The CORS headers of the prod URL should allow access from localhost:3000 as well as staging,
  // etc. sites.
  return `${PUBLIC_SITE}/api/v1/rfc-html/${rfcNumber}.json` as const
}

export const apiRfcDocRetrievePathBuilder = (rfcNumber: number) => {
  return `/api/v1/docretrieve/rfc${rfcNumber}.json` as const
}

const mailtoRegex = /^mailto:/
export const isMailToLink = (href?: string): boolean => {
  return mailtoRegex.test(href ?? '')
}

const httpRegex = /^https?:\/\//
export const isExternalLink = (href?: string): boolean => {
  if (
    href === undefined
    // although this scenario isn't an external link we shouldn't treat it as a Vue Router link so we'll call it external
  ) {
    return true
  }
  return httpRegex.test(href ?? '')
}

export const isInternalLink = (href?: string): boolean => !isExternalLink(href)

export const isHashLink = (href?: string): boolean => !!href?.startsWith('#')

/**
 * Converts arbitrary text into a custom id that is DOMId compliant (ie no whitespace)
 *
 * WARNING: this does not ensure unique DOM ids. It's not a uuid/useId hook. It just derives
 * an id from the input string.
 */
export const textToAnchorId = (text: string): string | undefined => {
  const normalized = text
    .trim()
    .toLowerCase() // lowercase before kebabCase() because otherwise kebabCase() will split 'RFCs' into 'rf-cs'
    .replace(/\./g, '-') // replace periods because otherwise "section 2.2" becomes "section22" rather than "section2-2" which is more readable in the url
    .replace(/[^0-9\-a-zA-Z\s]/g, '') // removes non-alphanumeric eg question marks
  if (
    // if it's an empty string then getVNodeText() probably returned an empty string, so just return `undefined`
    !normalized
  ) {
    return
  }

  return kebabCase(normalized)
}

const RFC_6761_EXAMPLECOM_URL = 'https://example.com/'

/**
 * Try parsing a relative url `href` string into a URL.
 * Because it's a `href` it will be resolved relative to `window.location`
 */
const tryParseHref = (href: string): URL | undefined => {
  try {
    return new URL(
      href,
      typeof window !== 'undefined' ?
        window.location.toString()
      : RFC_6761_EXAMPLECOM_URL
    )
  } catch (e: unknown) {
    console.info(
      `Failed to parse href ${JSON.stringify(href)} into URL. Error:`,
      e
    )
  }
}

export const linkPreviewImageUrlBuilder = (
  widthPx: (typeof imagePreviewDimensions)[number][0],
  heightPx: (typeof imagePreviewDimensions)[number][1]
) => {
  return `${PUBLIC_SITE}/link-preview-image-${widthPx}x${heightPx}.png` as const
}

/**
 * Based on the URL of the API base
 */
export const needsCloudflareHeaderForApi = (apiBaseUrl: string): boolean =>
  !apiBaseUrl.includes('localhost')

/**
 * Based on the URL of the API detect whether it's prod
 */
export const isProd = (url: string): boolean => !url.includes(PUBLIC_SITE)

export const isRfcEditorSite = (href?: string): boolean => {
  if (href === undefined) {
    return false
  }
  return (
    href.startsWith(PUBLIC_SITE) || href.startsWith('/') || href.startsWith('#')
  )
}

const RFC_REGEX = /(rfc[0-9]+)/i

export const parseMaybeRfcLink = (
  href?: string
): undefined | ReturnType<typeof parseRFCId> => {
  if (!href) {
    return undefined
  }
  if (
    href.startsWith('#')
    /**
     * Hrefs of internal links need to handled specially.
     *
     * If an internal link is "#rfc1234" then we'll parse that as an RFC Link.
     * E.g. the link to https://www.rfc-editor.org/rfc/rfc9794.html#RFC9370 is
     * linking to a reference to an RFC, not the RFC directly. Regardless we'll
     * treat it as a RFC Link.
     *
     * However hrefs are relative links and so we resolve them relative to the
     * current location, which means that if eg. the page '/info/rfc9000/' had
     * a `href` to '#section2.1' we don't want to parse that as an RFC Link
     * because the RFC part wasn't in the `href`.
     *
     **/
  ) {
    const rfcMatch = href.match(RFC_REGEX)
    if (!rfcMatch) return undefined
    return parseRFCId(rfcMatch[0])
  }
  const hrefUrl = tryParseHref(href)
  if (!hrefUrl) {
    return undefined
  }
  const isRfcEditor = isRfcEditorSite(href)
  if (isRfcEditor) {
    const rfcMatch = hrefUrl.pathname.match(RFC_REGEX)
    if (!rfcMatch) return undefined
    return parseRFCId(rfcMatch[0])
  }
  return undefined
}

/**
 * TypeSense wants spaces encoded as '+' char not '%20'.
 * This is questionable but necessary for integation with our search engine.
 * See also:
 *  * RFC 1866
 *  * https://stackoverflow.com/a/29948396
 */
const typeSenseEncodeUriComponent = (uriComponent: string) =>
  encodeURIComponent(uriComponent).replace(/%20/g, '+')
