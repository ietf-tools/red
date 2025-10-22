import { kebabCase } from 'lodash-es'
import type {
  ImagePreviewHorizontalDimensions,
  ImagePreviewVerticalDimensions
} from '../../shared/utils/meta-preview-images'
import type { MarkdownValidHrefs } from '../../shared/utils/markdown-valid-hrefs'
import { parseSeriesId, type SeriesId } from './rfc'
import type { RfcCommon } from './rfc-validators'
import { assertNever } from './typescript'
/**
 * Represents all known href string patterns
 */
export type ValidHrefs =
  | MarkdownValidHrefs // generated global type from types/markdown-valid-hrefs.d.ts
  | `https://${string}` // any external link is treated as valid (even if it might 404 we don't verify further)
  | typeof HOME_PATH
  | typeof RFC_INDEX_XML_PATH
  | typeof RFC_INDEX_ALL_ASCENDING_PATH
  | typeof RSS_PATH
  | typeof ATOM_PATH
  | typeof STANDARDS_PATH
  | typeof IN_NOTES_BCP_REF_TXT
  | typeof IN_NOTES_RFC_REF_TXT
  | typeof IN_NOTES_STD_REF_TXT
  | typeof REPORTS_CURRENT_QUEUE_STATS_TXT_PATH
  | typeof NEVER_ISSUED_PATH
  | typeof ALL_CLUSTERS_PATH
  | typeof STATUS_CHANGES_PATH
  | (typeof _FIXME_URLS)[number]
  | ReturnType<typeof markdownPathBuilder>
  | ReturnType<typeof searchPathBuilder>
  | ReturnType<typeof mailToBuilder>
  | ReturnType<typeof refsRefTxtPathBuilder>
  | ReturnType<typeof infoSeriesPathBuilder>
  | ReturnType<typeof rfcCommonPathBuilder>
  | ReturnType<typeof rfcPathBuilder>
  | ReturnType<typeof materialsTxtBuilder>
  | ReturnType<typeof rfcFormatPathBuilder>
  | ReturnType<typeof rfcCitePathBuilder>
  | ReturnType<typeof wikiDokuPathBuilder>
  | ReturnType<typeof materialsPathBuilder>
  | ReturnType<typeof dashboardPathBuilder>
  | ReturnType<typeof apiRfcBucketDocumentPathBuilder>

// url origin ie the part of a URL containing the protocol and hostname (but not the path, search, or hash)
// per https://developer.mozilla.org/en-US/docs/Web/API/URL/origin
// so don't have a trailing slash there's no path
export const PUBLIC_SITE_URL_ORIGIN = 'https://www.rfc-editor.org'
export const DATATRACKER_URL_ORIGIN = 'https://datatracker.ietf.org'
export const IETF_URL_ORIGIN = 'https://www.ietf.org'
export const IRTF_URL_ORIGIN = 'https://www.irtf.org'
export const IAB_URL_ORIGIN = 'https://www.iab.org'
export const INTERNET_SOCIETY_URL_ORIGIN = 'https://www.internetsociety.org'
export const MATERIALS_URL_ORIGIN = 'https://materials.rfc-editor.org'
export const IAD_URL_ORIGIN = 'https://iad.rfc-editor.org'
export const DASHBOARD_URL_ORIGIN = 'https://dashboard.rfc-editor.org'
export const INTERNET_DRAFT_AUTHOR_RESOURCES_URL_ORIGIN =
  'https://authors.ietf.org'

export const RFC_EDITOR_ERRATA_SEARCH_URL =
  'https://errata.rfc-editor.org/search/'
export const IETF_PRIVACY_STATEMENT_URL =
  'https://www.ietf.org/privacy-statement/'

export const HOME_PATH = '/'
export const CONTACT_PATH = '/about/contact/'
export const SEARCH_PATH = '/search/'

export const API_HOMEPAGE_LATEST_PATH = `/api/v1/homepage-latest.json`
export const API_RFC_MINI_INDEX_PATH = `/api/v1/rfc-mini-index.json`

export const RFC_INDEX_XML_PATH = '/rfc-index.xml'
export const RFC_INDEX_ALL_ASCENDING_PATH = '/rfc-index/'
export const REPORTS_CURRENT_QUEUE_STATS_TXT_PATH = '/reports/CurrQstats.txt'

export const STANDARDS_PATH = '/standards/'

export const RSS_PATH = '/rfcrss.xml'
export const ATOM_PATH = '/rfcatom.xml'

export const IN_NOTES_BCP_REF_TXT = '/in-notes/bcp-ref.txt'
export const IN_NOTES_RFC_REF_TXT = '/in-notes/rfc-ref.txt'
export const IN_NOTES_STD_REF_TXT = '/in-notes/std-ref.txt'

export const NEVER_ISSUED_PATH = '/never-issued/'
export const ALL_CLUSTERS_PATH = '/all_clusters/'
export const STATUS_CHANGES_PATH = '/status-changes/'

export const FIXME_IEN_INDEX_PATH = '/ien/ien-index/'
export const FIXME_REPORTS_SUBPUB_STATS_PATH = '/reports/subpub_stats/'
export const FIXME_RFCS_PER_YEAR_PATH = '/rfcs-per-year/'
export const FIXME_ERRATA_DEFINITIONS_PATH = '/errata-definitions/'
export const FIXME_INNOTES_PRERELEASE_PATH = '/in-notes/prerelease/'

/**
 * URLs to decide upon.
 * Eventually these might be wrong but we'll temporarily add them to VALID_HREFS
 */
const _FIXME_URLS = [
  FIXME_IEN_INDEX_PATH,
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
  q: string
  area: string
  stream: string
  statuses: string[]
  status: Status[]
  from: string
  to: string
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
          const typesenseSearchKey = searchKey
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
  const seriesId = parseSeriesId(rfcId)
  if (!seriesId) {
    throw Error(`Unable to parse ${JSON.stringify(rfcId)}`)
  }
  return `/refs/ref${seriesId.number}.txt` as const
}

export const infoSeriesPathBuilder = (rfcId: string) => {
  const seriesId = parseSeriesId(rfcId)
  if (!seriesId) {
    throw Error(`Unable to parse ${JSON.stringify(rfcId)}`)
  }
  return `/info/${seriesId.type.toLowerCase()}${seriesId.number}/` as const
}

export const rfcCommonPathBuilder = (rfcId: string) => {
  const seriesId = parseSeriesId(rfcId)
  if (!seriesId) {
    throw Error(`Unable to parse ${JSON.stringify(rfcId)}`)
  }
  return `/api/v1/rfc-common/${seriesId.number}.json` as const
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
  const seriesId = parseSeriesId(rfcId)
  if (!seriesId) {
    throw Error(`Unable to parse ${JSON.stringify(rfcId)}`)
  }
  return `/rfc/${seriesId.type.toLowerCase()}${seriesId.number}/${sectionHash ? (`#${sectionHash}` as const) : ''}` as const
}

export const materialsTxtBuilder = (txtFile: `${string}.txt`) => {
  return `/materials/${txtFile}` as const
}

export const rfcCitePathBuilder = (
  rfcId: string,
  format: 'txt' | 'bibTeX' | 'xml'
) => {
  const seriesId = parseSeriesId(rfcId)
  if (!seriesId) {
    throw Error(`Unable to parse ${JSON.stringify(rfcId)}`)
  }
  switch (format) {
    case 'txt':
      return `/refs/${seriesId.type.toLowerCase()}${seriesId.number}.txt` as const
    case 'xml':
      return `https://bib.ietf.org/public/rfc/bibxml/reference.${seriesId.type.toUpperCase()}.${seriesId.number}.xml` as const
    case 'bibTeX':
      return `https://datatracker.ietf.org/doc/${seriesId.type.toLowerCase()}${seriesId.number}/bibtex/` as const
  }
}

export const rfcFormatPathBuilder = (rfcId: string, format: 'html') => {
  const seriesId = parseSeriesId(rfcId)

  if (!seriesId) {
    throw Error(`Unable to parse ${JSON.stringify(rfcId)}.`)
  }

  switch (format) {
    case 'html':
      return `/rfc/${seriesId.type}${seriesId.number}.html` as const
  }
}

export const wikiDokuPathBuilder = (wikiPath: string) => {
  return `/rpc/wiki/doku.php?id=${wikiPath}` as const
}

export const materialsPathBuilder = (materialsPath: string) => {
  return `${MATERIALS_URL_ORIGIN}${materialsPath}` as const
}

export const iadReportsPathBuilder = (IADPath: string) => {
  return `${IAD_URL_ORIGIN}${IADPath}` as const
}

export const dashboardPathBuilder = (dashboardPath: string) => {
  return `${DASHBOARD_URL_ORIGIN}${dashboardPath}` as const
}

export const mailToBuilder = (email: string) => {
  return `mailto:${encodeURI(email.trim())}` as const
}

export const apiRfcBucketDocumentPathBuilder = (rfcNumber: number) => {
  return `/api/v1/rfc-html/${rfcNumber}.json` as const
}

export const apiSubseriesPathBuilder = (
  seriesType: SeriesId['type'],
  seriesNumber: SeriesId['number']
) => {
  return `/api/v1/info-subseries/${seriesType}${seriesNumber}.json` as const
}

const mailtoRegex = /^mailto:/
export const isMailToLink = (href?: string): boolean => {
  return mailtoRegex.test(href ?? '')
}

const httpRegex = /^https?:\/\//
export const isExternalLink = (href?: string): boolean => {
  if (
    href === undefined
    // although this scenario isn't an external link we shouldn't treat it as a Vue Router link so we'll consider it external
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

/**
 * Try parsing a relative url `href` string into a URL, relative to prod
 */
const tryParseHrefRelativeToProd = (href: string): URL | undefined => {
  try {
    return new URL(href, PUBLIC_SITE_URL_ORIGIN)
  } catch (e: unknown) {
    console.info(
      `Failed to parse href ${JSON.stringify(href)} into URL. Error:`,
      e
    )
  }
}

export const linkPreviewImageUrlBuilder = (
  widthPx: ImagePreviewHorizontalDimensions,
  heightPx: ImagePreviewVerticalDimensions
) => {
  return `/link-preview-image-${widthPx}x${heightPx}.png` as const
}

/**
 * Based on the URL of the API base
 */
export const needsCloudflareHeaderForApi = (apiBaseUrl: string): boolean =>
  !apiBaseUrl.includes('localhost')

/**
 * Based on the URL of the API detect whether it's prod
 */
export const isProd = (): boolean => !import.meta.dev

export const isRfcEditorSite = (href?: string): boolean => {
  if (href === undefined) {
    return false
  }
  return (
    href.startsWith(PUBLIC_SITE_URL_ORIGIN) ||
    href.startsWith('/') ||
    href.startsWith('#')
  )
}

const RFC_REGEX = /(rfc[0-9]+)/i

export const parseMaybeRfcLink = (
  href?: string
): undefined | ReturnType<typeof parseSeriesId> => {
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
    return parseSeriesId(rfcMatch[0])
  }
  const hrefUrl = tryParseHrefRelativeToProd(href)
  if (!hrefUrl) {
    return undefined
  }
  const isRfcEditor = isRfcEditorSite(href)
  if (isRfcEditor) {
    const rfcMatch = hrefUrl.pathname.match(RFC_REGEX)
    if (!rfcMatch) return undefined
    return parseSeriesId(rfcMatch[0])
  }
  return undefined
}

export const workingGroupUrlBuilder = (workingGroup: RfcCommon['group']) => {
  if (!workingGroup) return undefined
  // See https://github.com/ietf-tools/red/issues/179
  return `${DATATRACKER_URL_ORIGIN}/wg/${workingGroup.acronym}/about/` as const
}

export const areaGroupUrlBuilder = (area: RfcCommon['area']) => {
  if (!area) return undefined
  // See https://github.com/ietf-tools/red/issues/179
  return `${DATATRACKER_URL_ORIGIN}/wg/#${area.acronym.toUpperCase()}` as const
}

export const streamUrlBuilder = (stream: RfcCommon['stream']) => {
  if (!stream) return undefined
  // See https://github.com/ietf-tools/red/issues/179
  switch (stream.slug) {
    case 'IETF':
      return IETF_URL_ORIGIN
    case 'IRTF':
      return IRTF_URL_ORIGIN
    case 'IAB':
      return IAB_URL_ORIGIN
    case 'INDEPENDENT':
      return '/authors/rfc-independent-submissions/' satisfies ValidHrefs
    case 'Editorial':
      return `${DATATRACKER_URL_ORIGIN}/group/rswg/about/` as const
    case 'Legacy':
      return undefined
  }
  assertNever(stream.slug)
}

/**
 * TypeSense wants spaces encoded as '+' char not '%20'.
 * This is questionable but necessary for integation with our search engine.
 * See also:
 *  * RFC 1866
 *  * https://stackoverflow.com/a/29948396
 */
export const typeSenseEncodeUriComponent = (uriComponent: string) =>
  encodeURIComponent(uriComponent).replace(/%20/g, '+')

export const faviconPathBuilder = (widthPx: number, heightPx: number) => `/favicon-${widthPx}x${heightPx}.png`