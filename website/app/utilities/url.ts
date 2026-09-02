import { kebabCase } from 'es-toolkit'
import type {
  ImagePreviewHorizontalDimensions,
  ImagePreviewVerticalDimensions
} from '../../shared/utils/meta-preview-images'
import type { MarkdownValidHrefs } from '../../shared/utils/markdown-valid-hrefs'
import { parseSeriesId, type SeriesId } from './rfc'
import type { RfcCommon } from './rfc-validators'
import { typeSenseEncodeUriComponent } from './typesense-utils'
import { assertIsString, assertNever } from './typescript'
import type { searchV2PathBuilder } from './url-searchv2'
import {
  ACCOUNT_HOME_PATH,
  ALL_CLUSTERS_PATH,
  ATOM_PATH,
  FIXME_URLS,
  HOME_PATH,
  IAB_URL_ORIGIN,
  IETF_URL_ORIGIN,
  IN_NOTES_BCP_REF_TXT,
  IN_NOTES_RFC_REF_TXT,
  IN_NOTES_STD_REF_TXT,
  IRTF_URL_ORIGIN,
  NEVER_ISSUED_PATH,
  REPORTS_CURRENT_QUEUE_STATS_TXT_PATH,
  RFC_BLOBSTORE_PREFIX,
  RFC_INDEX_PATH,
  RFC_INDEX_XML_PATH,
  RSS_PATH,
  SEARCH_PATH,
  STATUS_CHANGES_PATH,
  SET_PATH,
  SUBJECTS_PATH
} from './url-constants'

// Constants moved to `url-constants.ts`; re-exported so existing importers of this module are
// unaffected. Keeping them dependency-free is what lets `url-searchv2.ts` take `SEARCH_PATH`
// without importing this module, which is what removed the cycle between the two.
export * from './url-constants'

// Moved to `typesense-utils.ts`, which is DOM-free; `typesense.ts` is not, and this module is
// reachable from the Nitro server build.
export { typeSenseEncodeUriComponent } from './typesense-utils'

/**
 * Represents all known href string patterns
 */
export type ValidHrefs =
  | MarkdownValidHrefs // generated global type from types/markdown-valid-hrefs.d.ts
  | `https://${string}` // any external link is treated as valid (even if it might 404 we don't verify further)
  | typeof HOME_PATH
  | typeof ACCOUNT_HOME_PATH
  | typeof RFC_INDEX_XML_PATH
  | typeof RFC_INDEX_PATH
  | typeof RSS_PATH
  | typeof ATOM_PATH
  | typeof IN_NOTES_BCP_REF_TXT
  | typeof IN_NOTES_RFC_REF_TXT
  | typeof IN_NOTES_STD_REF_TXT
  | typeof REPORTS_CURRENT_QUEUE_STATS_TXT_PATH
  | typeof NEVER_ISSUED_PATH
  | typeof ALL_CLUSTERS_PATH
  | typeof STATUS_CHANGES_PATH
  | typeof SET_PATH
  | (typeof FIXME_URLS)[number]
  | ReturnType<typeof markdownPathBuilder>
  | ReturnType<typeof searchPathBuilder>
  | ReturnType<typeof searchV2PathBuilder>
  | ReturnType<typeof mailToBuilder>
  | ReturnType<typeof telBuilder>
  | ReturnType<typeof refsRefTxtPathBuilder>
  | ReturnType<typeof infoSeriesPathBuilder>
  | ReturnType<typeof rfcCommonPathBuilder>
  | ReturnType<typeof rfcPathBuilder>
  | ReturnType<typeof materialsTxtBuilder>
  | ReturnType<typeof rfcFormatPathBuilder>
  | ReturnType<typeof wikiDokuPathBuilder>
  | ReturnType<typeof apiRfcBucketDocumentPathBuilder>

export const assertUrlOrigin = <FallbackConst extends string>(
  runtimeConfig: unknown,
  errorKey: string,
  fallback: FallbackConst
): FallbackConst => {
  assertIsString(runtimeConfig)
  const expectedOrigin = new URL(runtimeConfig).origin
  if (expectedOrigin !== runtimeConfig) {
    throw Error(
      `Nuxt runtime config ${JSON.stringify(errorKey)} isn't a URL origin pattern as expected. Was: ${JSON.stringify(runtimeConfig)} but expected ${JSON.stringify(expectedOrigin)}`
    )
  }
  return (runtimeConfig ?? fallback) as FallbackConst // for TS purposes we'll type the response as the fallback
}

// url origin ie the part of a URL containing the protocol and hostname (but not the path, search, or hash)
// per https://developer.mozilla.org/en-US/docs/Web/API/URL/origin
// so don't have a trailing slash there's no path
export const usePublicSiteUrlOrigin = () => {
  const runtimeConfig = useRuntimeConfig()
  return assertUrlOrigin(runtimeConfig.public.siteBase, 'siteBase', 'https://www.rfc-editor.org')
}
export const useApiV1UrlOrigin = () => {
  const runtimeConfig = useRuntimeConfig()

  return runtimeConfig.public.apiV1Base !== ''
    ? assertUrlOrigin(runtimeConfig.public.apiV1Base, 'apiV1Base', '')
    : runtimeConfig.public.apiV1Base
}
export const useErrataUrlOrigin = () => {
  const runtimeConfig = useRuntimeConfig()
  return assertUrlOrigin(runtimeConfig.public.errataBase, 'errataBase', 'https://errata.rfc-editor.org')
}
export const useQueueUrlOrigin = () => {
  const runtimeConfig = useRuntimeConfig()
  return assertUrlOrigin(runtimeConfig.public.queueBase, 'queueBase', 'https://queue.rfc-editor.org')
}
export const useDatatrackerUrlOrigin = () => {
  const runtimeConfig = useRuntimeConfig()
  return assertUrlOrigin(runtimeConfig.public.datatrackerBase, 'datatrackerBase', 'https://datatracker.ietf.org')
}
export const useIadUrlOrigin = () => {
  const runtimeConfig = useRuntimeConfig()
  return assertUrlOrigin(runtimeConfig.public.iadBase, 'iadBase', 'https://iad.rfc-editor.org')
}
export const useDashboardUrlOrigin = () => {
  const runtimeConfig = useRuntimeConfig()
  return assertUrlOrigin(runtimeConfig.public.dashboardBase, 'dashboardBase', 'https://dashboard.rfc-editor.org')
}
export const useRfcEditorErrataSearchUrl = () => {
  return `${useErrataUrlOrigin()}/search/`
}
export const useRfcEditorErrataSearchForRfcUrl = (rfcNumber: number) => {
  return `${useErrataUrlOrigin()}/search/?rfc_number=${rfcNumber}`
}
export const useRfcEditorQueueClustersUrl = () => {
  return `${useQueueUrlOrigin()}/clusters/`
}
export const useIadReportsPathBuilder = (IADPath: string) => {
  return `${useIadUrlOrigin()}${IADPath}` as const
}

/**
 * this assumes that a PDF exists. It doesn't check in advance.
 */
export const useRfcPdfPathBuilder = (rfcNumber: number) => {
  return `${RFC_BLOBSTORE_PREFIX}rfc${rfcNumber}.pdf` as const
}

export const apiMarkdownPagePathBuilder = (slug: string) => `/api/v1/content/${slug}.json` as const

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
  showObsoleted?: '1'
}

export const searchPathBuilder = (searchParams: Partial<SearchPathBuilderProps>): `${typeof SEARCH_PATH}${string}` => {
  const hasParams = Object.values(searchParams).join('').trim().length > 0
  return `${SEARCH_PATH}${hasParams ? '?' : ''}${
    hasParams
      ? Object.keys(searchParams)
          .sort() // normalize order
          .map((searchKey) => {
            const typesenseSearchKey = searchKey
            const searchValue = searchParams[searchKey as keyof SearchPathBuilderProps]

            return searchValue
              ? `${encodeURIComponent(typesenseSearchKey)}=${typeSenseEncodeUriComponent(
                  Array.isArray(searchValue) ? searchValue.join(',') : searchValue
                )}`
              : ''
          })
          .filter(Boolean)
          .join('&')
      : ''
  }`
}

/**
 * Lives in `url-searchv2.ts` to keep this module manageable, and is re-exported here so callers
 * can import it from either place. That module takes its dependencies from `url-constants.ts`
 * and `typesense-utils.ts` rather than from here, so this edge is one-way.
 */
export { searchV2PathBuilder, type SearchV2StatusName } from './url-searchv2'

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
export const markdownPathBuilder = (markdownPath: MarkdownValidHrefs) => markdownPath

export const rfcPathBuilder = (rfcId: string, sectionHash?: `section-${string}`) => {
  const seriesId = parseSeriesId(rfcId)
  if (!seriesId) {
    throw Error(`Unable to parse ${JSON.stringify(rfcId)}`)
  }
  return `${RFC_BLOBSTORE_PREFIX}${seriesId.type.toLowerCase()}${seriesId.number}/${sectionHash ? (`#${sectionHash}` as const) : ''}` as const
}

export const materialsTxtBuilder = (txtFile: `${string}.txt`) => {
  return `/materials/${txtFile}` as const
}

export const rfcCitePathBuilder = (rfcId: string, format: 'txt' | 'bibTeX' | 'xml') => {
  const seriesId = parseSeriesId(rfcId)
  if (!seriesId) {
    throw Error(`Unable to parse ${JSON.stringify(rfcId)}`)
  }
  switch (format) {
    case 'txt':
      if (seriesId.type !== 'rfc') {
        const errorTitle = "Internal error, can't make citation url for non-RFC"
        console.error(`${errorTitle}. Was: `, JSON.stringify(seriesId))
        throw Error(errorTitle)
      }
      return `/refs/ref${seriesId.number}.txt` as const
    case 'xml':
      return `https://bib.ietf.org/public/rfc/bibxml/reference.${seriesId.type.toUpperCase()}.${seriesId.number}.xml` as const
    case 'bibTeX':
      return `https://datatracker.ietf.org/doc/${seriesId.type.toLowerCase()}${seriesId.number}/bibtex/` as const
  }
}

export const doiUrlBuilder = (identifierValue: string, encodeIdentifier: boolean) =>
  `https://doi.org/${encodeIdentifier ? encodeURI(identifierValue) : identifierValue}` as const

type FormatCommon = RfcCommon['formats'][number]['format']

export const rfcFormatPathBuilder = (rfcId: string, format: FormatCommon) => {
  const seriesId = parseSeriesId(rfcId)

  if (!seriesId) {
    throw Error(`Unable to parse ${JSON.stringify(rfcId)}.`)
  }

  return `${RFC_BLOBSTORE_PREFIX}${seriesId.type}${seriesId.number}.${format}` as const
}

export const wikiDokuPathBuilder = (wikiPath: string) => {
  return `/rpc/wiki/doku.php?id=${wikiPath}` as const
}

export const useDashboardPathBuilder = (dashboardPath: string) => {
  return `${useDashboardUrlOrigin()}${dashboardPath}` as const
}

export const mailToBuilder = (email: string) => {
  return `mailto:${encodeURI(email.trim())}` as const
}

export const telBuilder = (phoneNumber: string) => {
  return `tel:${encodeURI(phoneNumber.trim())}` as const
}

export const apiRfcBucketDocumentPathBuilder = (rfcNumber: number) => {
  return `/api/v1/rfc-html/${rfcNumber}.json` as const
}

export const apiSubseriesPathBuilder = (seriesType: SeriesId['type'], seriesNumber: SeriesId['number']) => {
  return `/api/v1/info-subseries/${seriesType}${seriesNumber}.json` as const
}

const mailtoRegex = /^mailto:/
export const isMailToLink = (href?: string): boolean => {
  return mailtoRegex.test(href ?? '')
}

const telRegex = /^tel:/
export const isTelLink = (href?: string): boolean => {
  return telRegex.test(href ?? '')
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

export const isRSSLink = (href?: string): boolean => !!href?.endsWith(RSS_PATH)

export const isAtomLink = (href?: string): boolean => !!href?.endsWith(ATOM_PATH)

/**
 * Links outside Nuxt (eg blobstore or links to paths that HTTP redirect)
 * shouldn't use Nuxt SPA links, they should use conventional `<a href>` links.
 */
export const isOutsideNuxtLink = (href?: string): boolean => {
  if (!href) {
    return false // FIXME: review this value, maybe this should be `true`? I can't think of a scenario where no href should be treated as a NuxtLink
  }
  if (href.startsWith(RFC_BLOBSTORE_PREFIX)) {
    return true
  }
  if (
    /**
     * previous site paths like
     *  * https://www.rfc-editor.org/bcp/bcp47
     *  * https://www.rfc-editor.org/fyi/fyi2
     *  * https://www.rfc-editor.org/std/std3
     */
    //
    href.startsWith('/bcp/') ||
    href.startsWith('/fyi/') ||
    href.startsWith('/std/')
  ) {
    return true
  }
  if (
    // eg /refs/ref9000.txt
    href.startsWith('/refs/')
  ) {
    return true
  }
  if (
    // eg /errata/eid1912
    href.startsWith('/errata/')
  ) {
    return true
  }
  if (
    // eg /ien/ien119.txt
    href.startsWith('/ien/')
  ) {
    return true
  }
  if (isExternalLink(href)) {
    return true
  }
  if (isApiLink(href)) {
    return true
  }
  if (isRSSLink(href) || isAtomLink(href)) {
    return true
  }
  if (isMailToLink(href) || isTelLink(href)) {
    return true
  }
  if (isHashLink(href)) {
    return true
  }
  return false
}

export const isApiLink = (href?: string): boolean => {
  if (!href) {
    return false
  }
  return href.startsWith('/api/')
}

/**
 * Converts arbitrary string into a custom id that is DOMId compliant (ie no whitespace)
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

export const linkPreviewImageUrlBuilder = (
  widthPx: ImagePreviewHorizontalDimensions,
  heightPx: ImagePreviewVerticalDimensions
) => {
  return `/api/v1/meta-thumbnail/rfc-editor-logo-${widthPx}x${heightPx}.png` as const
}

export const metaThumbnailPathBuilder = (rfcId: string) => `/api/v1/meta-thumbnail/${rfcId}.png` as const

/**
 * Based on the URL of the API base
 */
export const needsCloudflareHeaderForApi = (apiBaseUrl: string): boolean => !apiBaseUrl.includes('localhost')

/**
 * Based on the URL of the API detect whether it's prod
 */
export const isProd = (): boolean => !import.meta.dev

const RFC_REGEX = /(rfc[0-9]+)/i

export const parseMaybeRfcLink = (href?: string): undefined | ReturnType<typeof parseSeriesId> => {
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
     * treat it as a RFC Link Preview for RFC 9370.
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
  if (isInternalLink(href)) {
    const rfcMatch = href.match(RFC_REGEX)
    if (!rfcMatch) return undefined
    return parseSeriesId(rfcMatch[0])
  }
  return undefined
}

export const setPathBuilder = (setId: string) => `${SET_PATH}?id=${encodeURIComponent(setId)}` as const

export const useWorkingGroupUrlBuilder = (workingGroup: RfcCommon['group']) => {
  if (!workingGroup) return undefined
  // See https://github.com/ietf-tools/red/issues/179
  return `${useDatatrackerUrlOrigin()}/wg/${workingGroup.acronym}/about/` as const
}

export const useDatatrackerRFCUrlBuilder = (rfcNumber: RfcCommon['number']) => {
  return `${useDatatrackerUrlOrigin()}/doc/rfc${rfcNumber}/` as const
}

export const useErrataUrlBuilder = (
  errataId: string
  // errataId looks like '1234' (not 'eid1234') so we'll need to add the 'eid' prefix
) => {
  return `${useErrataUrlOrigin()}/eid${errataId}/` as const
}

export const areaGroupUrlBuilder = (area: RfcCommon['area']) => {
  if (!area) return undefined
  // See https://github.com/ietf-tools/red/issues/179
  return `${useDatatrackerUrlOrigin()}/wg/#${area.acronym.toUpperCase()}` as const
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
      return `${useDatatrackerUrlOrigin()}/group/rswg/about/` as const
    case 'Legacy':
      return undefined
  }
  assertNever(stream.slug)
}

export const datatrackerAuthorUrlBuilder = (datatracker_person_path: string) => {
  return `${useDatatrackerUrlOrigin()}${datatracker_person_path}`
}

export const faviconPathBuilder = (widthPx: number, heightPx: number) => `/api/v1/favicon/${widthPx}x${heightPx}.png`

export const subjectsPathBuilder = (
  /** eg 'a', 'b', ... */
  subject: string
) => {
  return `${SUBJECTS_PATH}${subject ? `${subject}/` : ''}`
}
