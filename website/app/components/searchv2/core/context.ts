import { inject, provide, type InjectionKey } from 'vue'
import type { SearchContext } from '../types'

export const searchContextKey: InjectionKey<SearchContext> = Symbol('searchv2:context')

export function provideSearchContext(context: SearchContext): void {
  provide(searchContextKey, context)
}

export function useSearchContext(): SearchContext {
  const context = inject(searchContextKey)
  if (!context) {
    throw new Error('[searchv2] widgets must be used inside <SearchRoot>')
  }
  return context
}
