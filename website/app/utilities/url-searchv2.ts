import type { TypesenseStatusName } from './typesense-status'
import { typeSenseEncodeUriComponent } from './typesense-utils'
import { SEARCH_PATH } from './url-constants'
import { yearMonthToParam, type YearMonth } from './year-month'

/**
 * URL building for the searchv2 search page. Split out of `url.ts` to keep that module
 * manageable; `url.ts` re-exports `searchV2PathBuilder` so callers can keep importing from
 * either place.
 *
 * Nothing here imports `url.ts` — the constant and the encoder come from modules below it — so
 * the dependency on that module runs one way only.
 *
 * Must stay DOM-free: `url.ts` imports this and is reachable from the Nitro server build,
 * whose tsconfig project has no DOM lib.
 */

/**
 * The `status.name` values the search index can return, derived from the schema that
 * validates search responses so this can't drift from the facet's actual vocabulary.
 */
export type SearchV2StatusName = TypesenseStatusName

/**
 * Bounds are year/month rather than `Date`s or numbers, matching both the `yyyy-M` URL format
 * and the resolution the search UI offers. A `Date` would imply day and time precision that
 * gets discarded, and a bare number invites a year being read as a unix timestamp.
 *
 * `from` covers the month from its first second, `to` through its last; omitting `month`
 * means the whole year.
 */
type SearchV2PublicationDateRange = {
  from?: YearMonth
  to?: YearMonth
}

/** The fields the index is configured to sort on. An empty string selects relevance order. */
type SearchV2SortValue = '' | `${'publicationDate' | 'rfcNumber'}:${'asc' | 'desc'}`

/** Mirrors the choices offered by the search page's HitsPerPage widget. */
type SearchV2PerPage = 10 | 25 | 50 | 100

type SearchV2PathBuilderProps = {
  q: string
  /** `status.name` refinement, multi-select. */
  status: SearchV2StatusName[]
  /** `group.full` refinement, multi-select. Open vocabulary, so untyped. */
  group: string[]
  /** `authors.name` refinement, multi-select. Open vocabulary, so untyped. */
  authors: string[]
  /**
   * `stream.slug` menu, single-select, eg `ietf`. A stable identifier rather than the display
   * name. Untyped: the index owns this vocabulary and can gain values at any time, so a union
   * here would reject valid input until someone redeployed.
   */
  stream: string
  /** `area.acronym` menu, single-select, eg `art`. Untyped for the same reason as `stream`. */
  area: string
  published: SearchV2PublicationDateRange
  /** 1-based, matching the `page` query param rather than the search engine's internal index. */
  page: number
  perPage: SearchV2PerPage
  sort: SearchV2SortValue
  searchObsoleted: boolean
  searchMetadataOnly: boolean
}

/**
 * Builds a `/search/` path for the searchv2 search page.
 *
 * The param names and encodings here are the inverse of `parseQuery` in
 * `searchv2-nuxt-adapter.ts`, which is what the search page reads its state from.
 *
 * Toggles are written whenever they're supplied, including when the value happens to
 * match the search page's own default, so a link's behaviour doesn't change if that
 * default is later revised.
 *
 * Prefer this over `searchPathBuilder`, which predates searchv2 and can't express
 * group, authors, publication date, sort, page or per-page.
 */
export const searchV2PathBuilder = (
  searchParams: Partial<SearchV2PathBuilderProps>
): `${typeof SEARCH_PATH}${string}` => {
  const {
    q,
    status,
    group,
    authors,
    stream,
    area,
    published,
    page,
    perPage,
    sort,
    searchObsoleted,
    searchMetadataOnly
  } = searchParams

  const params: [key: string, value: string][] = []

  const addValue = (key: string, value: string | undefined) => {
    if (value) params.push([key, typeSenseEncodeUriComponent(value)])
  }

  const addList = (key: string, values: string[] | undefined) => {
    // Repeated params rather than one delimited value, so a value containing the delimiter
    // can't be read back as two values. Matches `list` in the searchv2 Nuxt adapter.
    values?.forEach((value) => addValue(key, value))
  }

  addValue('q', q)
  addList('status', status)
  addList('group', group)
  addList('authors', authors)
  addValue('stream', stream)
  addValue('area', area)
  addValue('sort', sort)

  // `yyyy-M`, not a unix timestamp, so the range stays readable in the URL.
  if (published?.from) addValue('from', yearMonthToParam(published.from))
  if (published?.to) addValue('to', yearMonthToParam(published.to))

  if (page !== undefined && page > 1) params.push(['page', String(page)])
  if (perPage !== undefined) params.push(['perPage', String(perPage)])
  if (searchObsoleted !== undefined) params.push(['searchObsoleted', searchObsoleted ? '1' : '0'])
  if (searchMetadataOnly !== undefined) params.push(['searchMetadataOnly', searchMetadataOnly ? '1' : '0'])

  if (params.length === 0) {
    return SEARCH_PATH
  }

  const search = params
    // Normalize order. A codepoint comparison rather than `localeCompare` so the result
    // doesn't vary with the runtime's locale, and a stable sort so repeated keys keep the
    // caller's value order.
    .sort(([keyA], [keyB]) => (keyA === keyB ? 0 : keyA < keyB ? -1 : 1))
    .map(([key, value]) => `${key}=${value}`)
    .join('&')

  return `${SEARCH_PATH}?${search}`
}
