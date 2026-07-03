import { computed } from 'vue'
import type { LocationQuery, LocationQueryValue } from 'vue-router'
import type { StateAdapter, UiState } from '~/components/searchv2'
import { SEARCH_PATH } from '~/utilities/url'

const HIDDEN_DEFAULT = 'flags.hiddenDefault'

/**
 * Nuxt state adapter: the URL query is the source of truth for search state.
 * Reads reactively from the route (so external URL changes and back/forward flow in)
 * and writes via `navigateTo(..., { replace })`.
 */
export function useNuxtStateAdapter(options: { defaultShowObsoleted: boolean }): StateAdapter {
  const route = useRoute()
  const router = useRouter()
  const { defaultShowObsoleted } = options

  const state = computed<UiState>(() => parseQuery(route.query, defaultShowObsoleted))

  const write = (next: UiState) => {
    void navigateTo({ path: SEARCH_PATH, query: serializeQuery(next, defaultShowObsoleted) }, { replace: true })
  }

  const createURL = (next: UiState) =>
    router.resolve({ path: SEARCH_PATH, query: serializeQuery(next, defaultShowObsoleted) }).href

  return { state, write, createURL }
}

function first(value: LocationQueryValue | LocationQueryValue[] | undefined): string | undefined {
  const resolved = Array.isArray(value) ? value[0] : value
  return resolved ?? undefined
}

function csv(value: LocationQueryValue | LocationQueryValue[] | undefined): string[] | undefined {
  const resolved = first(value)
  const parts = resolved ? resolved.split(',').filter(Boolean) : []
  return parts.length > 0 ? parts : undefined
}

function parseQuery(query: LocationQuery, defaultShowObsoleted: boolean): UiState {
  const refinements: Record<string, string[]> = {}
  const status = csv(query.status ?? query.statuses)
  if (status) refinements['status.name'] = status
  const group = csv(query.group)
  if (group) refinements['group.full'] = group
  const authors = csv(query.authors)
  if (authors) refinements['authors.name'] = authors

  const menu: Record<string, string> = {}
  const stream = first(query.stream)
  if (stream) menu['stream.name'] = stream
  const area = first(query.area)
  if (area) menu['area.full'] = area

  const numericRefinements: Record<string, { min?: number; max?: number }> = {}
  const publicationDate = parsePublicationDate(query)
  if (publicationDate) numericRefinements.publicationDate = publicationDate

  const showObsoleted = first(query.showObsoleted)
  const hiddenDefault = showObsoleted !== undefined ? showObsoleted !== '1' : !defaultShowObsoleted
  const contents = first(query.contents) === '1'

  const pageParam = Number(first(query.page))
  const page = Number.isFinite(pageParam) && pageParam > 1 ? pageParam - 1 : 0
  const perPageParam = Number(first(query.perPage))
  const hitsPerPage = Number.isFinite(perPageParam) && perPageParam > 0 ? perPageParam : undefined

  const state: UiState = {
    query: first(query.q),
    sortBy: first(query.sort),
    toggles: { [HIDDEN_DEFAULT]: hiddenDefault, contents }
  }
  if (Object.keys(refinements).length > 0) state.refinements = refinements
  if (Object.keys(menu).length > 0) state.menu = menu
  if (Object.keys(numericRefinements).length > 0) state.numericRefinements = numericRefinements
  if (page > 0) state.page = page
  if (hitsPerPage) state.hitsPerPage = hitsPerPage
  return state
}

function parsePublicationDate(query: LocationQuery): { min?: number; max?: number } | undefined {
  const pubDate = first(query.pubDate)
  if (pubDate) {
    const [min, max] = pubDate.split(':')
    return { min: toNumber(min), max: toNumber(max) }
  }
  const from = toNumber(first(query.from))
  const to = toNumber(first(query.to))
  if (from !== undefined || to !== undefined) return { min: from, max: to }
  return undefined
}

function toNumber(value: string | undefined): number | undefined {
  if (value === undefined || value === '') return undefined
  const parsed = Number(value)
  return Number.isNaN(parsed) ? undefined : parsed
}

function serializeQuery(state: UiState, defaultShowObsoleted: boolean): LocationQuery {
  const query: Record<string, string> = {}

  if (state.query) query.q = state.query

  const status = state.refinements?.['status.name']
  if (status?.length) query.status = status.join(',')
  const group = state.refinements?.['group.full']
  if (group?.length) query.group = group.join(',')
  const authors = state.refinements?.['authors.name']
  if (authors?.length) query.authors = authors.join(',')

  const stream = state.menu?.['stream.name']
  if (stream) query.stream = stream
  const area = state.menu?.['area.full']
  if (area) query.area = area

  const publicationDate = state.numericRefinements?.publicationDate
  if (publicationDate && (publicationDate.min !== undefined || publicationDate.max !== undefined)) {
    query.pubDate = `${publicationDate.min ?? ''}:${publicationDate.max ?? ''}`
  }

  const hiddenDefault = state.toggles?.[HIDDEN_DEFAULT] ?? !defaultShowObsoleted
  if (hiddenDefault !== !defaultShowObsoleted) query.showObsoleted = hiddenDefault ? '0' : '1'
  if (state.toggles?.contents) query.contents = '1'

  if (state.sortBy) query.sort = state.sortBy
  if (state.page && state.page > 0) query.page = String(state.page + 1)
  if (state.hitsPerPage) query.perPage = String(state.hitsPerPage)

  return query
}
