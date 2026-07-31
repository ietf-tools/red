/**
 * Static URL origins and paths.
 *
 * Split out of `url.ts` so that modules needing only a path constant don't have to import the
 * builders and predicates alongside it — which is what previously forced an import cycle
 * between `url.ts` and `url-searchv2.ts`.
 *
 * Deliberately dependency-free: nothing here imports anything, so any module can use it
 * without pulling in a graph. `url.ts` re-exports all of it, so existing callers are
 * unaffected by the move.
 */

export const IETF_URL_ORIGIN = 'https://www.ietf.org'
export const IRTF_URL_ORIGIN = 'https://www.irtf.org'
export const IAB_URL_ORIGIN = 'https://www.iab.org'
export const INTERNET_SOCIETY_URL_ORIGIN = 'https://www.internetsociety.org'
export const INTERNET_DRAFT_AUTHOR_RESOURCES_URL_ORIGIN = 'https://authors.ietf.org'
export const IETF_PRIVACY_STATEMENT_URL = 'https://www.ietf.org/privacy-statement/'

export const INTERNET_DRAFT_AUTHOR_RESOURCES_RFC_PUBLICATION_PROCESS_URL = `${INTERNET_DRAFT_AUTHOR_RESOURCES_URL_ORIGIN}/rfc-publication-process`

export const HOME_PATH = '/'
export const CONTACT_PATH = '/about/contact/'
export const SEARCH_PATH = '/search/'
export const RFC_INDEX_PATH = '/rfc-index/'
export const ACCOUNT_HOME_PATH = '/account/'

export const API_HOMEPAGE_LATEST_PATH = `/api/v1/homepage-latest.json`
export const API_RFC_MINI_INDEX_PATH = `/api/v1/rfc-mini-index.json`

export const API_NO_JS_SERVER_SEARCH_PATH = `/api/v1/search/`

export const RFC_INDEX_XML_PATH = '/rfc-index.xml'
export const REPORTS_CURRENT_QUEUE_STATS_TXT_PATH = '/reports/CurrQstats.txt'

export const RSS_PATH = '/rfcrss.xml'
export const ATOM_PATH = '/rfcatom.xml'

export const IN_NOTES_BCP_REF_TXT = '/in-notes/bcp-ref.txt'
export const IN_NOTES_RFC_REF_TXT = '/in-notes/rfc-ref.txt'
export const IN_NOTES_STD_REF_TXT = '/in-notes/std-ref.txt'

export const NEVER_ISSUED_PATH = '/never-issued/'
export const ALL_CLUSTERS_PATH = '/all_clusters/'
export const STATUS_CHANGES_PATH = '/status-changes/'

/** Prefix for blobstore-served RFC documents, which are outside Nuxt's routing. */
export const RFC_BLOBSTORE_PREFIX = '/rfc/'

export const FIXME_IEN_INDEX_PATH = '/ien/ien-index/'
export const FIXME_REPORTS_SUBPUB_STATS_PATH = '/reports/subpub_stats/'
export const FIXME_RFCS_PER_YEAR_PATH = '/rfcs-per-year/'
export const FIXME_ERRATA_DEFINITIONS_PATH = '/errata-definitions/'
export const FIXME_INNOTES_PRERELEASE_PATH = '/in-notes/prerelease/'

/**
 * URLs to decide upon.
 * Eventually these might be wrong but we'll temporarily add them to VALID_HREFS
 */
export const FIXME_URLS = [
  FIXME_IEN_INDEX_PATH,
  FIXME_REPORTS_SUBPUB_STATS_PATH,
  FIXME_RFCS_PER_YEAR_PATH,
  FIXME_ERRATA_DEFINITIONS_PATH,
  FIXME_INNOTES_PRERELEASE_PATH
] as const
