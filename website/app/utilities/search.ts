import type { InjectionKey } from 'vue'

export const SEARCH_PLACEHOLDER = 'Find an RFC (number, subseries, title, author, etc.)'

export const NOSCRIPT_IFRAME_DOM_ID = 'search-terms'

export const clearSearchQueryKey = Symbol() as InjectionKey<() => void>
