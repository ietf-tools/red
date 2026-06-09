import type { InjectionKey } from 'vue'

export const SEARCH_PLACEHOLDER = 'Find an RFC (number, subseries, title, author, etc.)'

export const NOSCRIPT_IFRAME_DOM_ID = 'search-terms'

export const FLAGS_HIDDEN_DEFAULT_KEY = 'flags.hiddenDefault' as const

export const clearSearchQueryKey = Symbol() as InjectionKey<() => void>
export const resetHiddenDefaultKey = Symbol() as InjectionKey<() => void>
