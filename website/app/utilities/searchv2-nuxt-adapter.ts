import { computed } from 'vue'
import type { LocationQuery, LocationQueryValue } from 'vue-router'
import type { StateAdapter, UiState } from '~/components/searchv2'
import { SEARCH_PATH } from '~/utilities/url'
import { formatYearMonth, parseYearMonth, yearMonthToEnd, yearMonthToStart } from '~/utilities/year-month'

/**
 * Boolean toggles the URL round-trips, mapped to their query param names. A toggle is
 * written to the URL only when it differs from its configured default (see `serializeQuery`),
 * so the param encodes the actual value rather than a fixed polarity.
 */
const TOGGLE_PARAMS: Record<string, string> = {
  searchObsoleted: 'searchObsoleted',
  searchMetadataOnly: 'searchMetadataOnly'
}

/**
 * Nuxt state adapter: the URL query is the source of truth for search state.
 * Reads reactively from the route (so external URL changes and back/forward flow in)
 * and writes via `navigateTo(..., { replace })`.
 *
 * `defaultUiState` is the single baseline the adapter diffs against: absent params parse
 * back to their default, and values equal to their default are omitted from the URL.
 */
export function useNuxtStateAdapter(defaultUiState: UiState = {}): StateAdapter {
  const route = useRoute()
  const router = useRouter()

  const state = computed<UiState>(() => parseQuery(route.query, defaultUiState))

  const write = (next: UiState) => {
    void navigateTo({ path: SEARCH_PATH, query: serializeQuery(next, defaultUiState) }, { replace: true })
  }

  const createURL = (next: UiState) =>
    router.resolve({ path: SEARCH_PATH, query: serializeQuery(next, defaultUiState) }).href

  return { state, write, createURL }
}

function first(value: LocationQueryValue | LocationQueryValue[] | undefined): string | undefined {
  const resolved = Array.isArray(value) ? value[0] : value
  return resolved ?? undefined
}

/**
 * Multi-value params are read as repeated occurrences of the key (`?authors=A&authors=B`),
 * which vue-router hands us as an array. Deliberately not delimiter-separated: a value
 * containing the delimiter would otherwise be read back as two separate values, and no
 * amount of encoding prevents it because the query is fully decoded before we see it.
 */
function list(value: LocationQueryValue | LocationQueryValue[] | undefined): string[] | undefined {
  const values = (Array.isArray(value) ? value : [value]).filter(
    (entry): entry is string => typeof entry === 'string' && entry !== ''
  )
  return values.length > 0 ? values : undefined
}

/**
 * `status` additionally accepts a comma-separated list, because the worker's legacy search
 * redirects emit that form (`?status=Historic,Experimental`) and rewriting them isn't on the
 * table. Sound for this param alone: the status vocabulary is closed and contains no commas.
 * Open vocabularies (`group`, `authors`) stay repeated-params only — see `list`.
 */
function listAllowingCsv(value: LocationQueryValue | LocationQueryValue[] | undefined): string[] | undefined {
  const values = list(value)
    ?.flatMap((entry) => entry.split(','))
    .filter(Boolean)
  return values && values.length > 0 ? values : undefined
}

export function parseQuery(query: LocationQuery, defaultUiState: UiState = {}): UiState {
  const refinements: Record<string, string[]> = {}
  // `statuses` is the pre-searchv2 alias for the same facet.
  const status = listAllowingCsv(query.status ?? query.statuses)
  if (status) refinements['status.name'] = status
  const group = list(query.group)
  if (group) refinements['group.full'] = group
  const authors = list(query.authors)
  if (authors) refinements['authors.name'] = authors

  // Single-select facets key on the index's stable identifiers, not its display names, so the
  // `?stream=ietf` / `?area=art` the worker's legacy redirects emit resolve, and a rename in the
  // index doesn't silently break links. The controls display the matching names — see
  // RFCSearchFilters.
  const menu: Record<string, string> = {}
  const stream = first(query.stream)
  if (stream) menu['stream.slug'] = stream
  const area = first(query.area)
  if (area) menu['area.acronym'] = area

  const numericRefinements: Record<string, { min?: number; max?: number }> = {}
  const publicationDate = parsePublicationDate(query)
  if (publicationDate) numericRefinements.publicationDate = publicationDate

  // Each toggle parses to its URL param when present, otherwise to its configured default.
  const toggles: Record<string, boolean> = {}
  for (const [attribute, param] of Object.entries(TOGGLE_PARAMS)) {
    const raw = first(query[param])
    toggles[attribute] = raw !== undefined ? raw === '1' : Boolean(defaultUiState.toggles?.[attribute])
  }

  const pageParam = Number(first(query.page))
  const page = Number.isFinite(pageParam) && pageParam > 1 ? pageParam - 1 : 0
  const perPageParam = Number(first(query.perPage))
  const hitsPerPage = Number.isFinite(perPageParam) && perPageParam > 0 ? perPageParam : undefined

  const state: UiState = {
    query: first(query.q),
    sortBy: first(query.sort),
    toggles
  }
  if (Object.keys(refinements).length > 0) state.refinements = refinements
  if (Object.keys(menu).length > 0) state.menu = menu
  if (Object.keys(numericRefinements).length > 0) state.numericRefinements = numericRefinements
  if (page > 0) state.page = page
  if (hitsPerPage) state.hitsPerPage = hitsPerPage
  return state
}

/**
 * Publication date bounds are `from`/`to` in `yyyy-M`, which is the format the worker's legacy
 * search redirects already emit and is far more legible than a unix timestamp. UiState keeps
 * unix seconds because that's what the index filters on.
 */
function parsePublicationDate(query: LocationQuery): { min?: number; max?: number } | undefined {
  const from = parseYearMonth(first(query.from))
  const to = parseYearMonth(first(query.to))
  if (from || to) {
    return {
      min: from && yearMonthToStart(from),
      max: to && yearMonthToEnd(to)
    }
  }

  // Legacy `pubDate=<minUnixSeconds>:<maxUnixSeconds>` written by the previous search page,
  // read so existing bookmarks keep working. Never written back.
  const pubDate = first(query.pubDate)
  if (pubDate) {
    const [min, max] = pubDate.split(':')
    const parsed = { min: toNumber(min), max: toNumber(max) }
    if (parsed.min !== undefined || parsed.max !== undefined) return parsed
  }

  return undefined
}

function toNumber(value: string | undefined): number | undefined {
  if (value === undefined || value === '') return undefined
  const parsed = Number(value)
  return Number.isNaN(parsed) ? undefined : parsed
}

export function serializeQuery(state: UiState, defaultUiState: UiState = {}): LocationQuery {
  const query: LocationQuery = {}

  if (state.query) query.q = state.query

  // Multi-select facets are written as arrays, which vue-router stringifies into one
  // occurrence of the key per value. See `list` for why they aren't delimiter-joined.
  const status = state.refinements?.['status.name']
  if (status?.length) query.status = status
  const group = state.refinements?.['group.full']
  if (group?.length) query.group = group
  const authors = state.refinements?.['authors.name']
  if (authors?.length) query.authors = authors

  const stream = state.menu?.['stream.slug']
  if (stream) query.stream = stream
  const area = state.menu?.['area.acronym']
  if (area) query.area = area

  const publicationDate = state.numericRefinements?.publicationDate
  if (publicationDate?.min !== undefined) query.from = formatYearMonth(publicationDate.min)
  if (publicationDate?.max !== undefined) query.to = formatYearMonth(publicationDate.max)

  // A toggle appears in the URL only when it differs from its configured default.
  for (const [attribute, param] of Object.entries(TOGGLE_PARAMS)) {
    const value = Boolean(state.toggles?.[attribute])
    const fallback = Boolean(defaultUiState.toggles?.[attribute])
    if (value !== fallback) query[param] = value ? '1' : '0'
  }

  if (state.sortBy) query.sort = state.sortBy
  if (state.page && state.page > 0) query.page = String(state.page + 1)
  if (state.hitsPerPage) query.perPage = String(state.hitsPerPage)

  return query
}
