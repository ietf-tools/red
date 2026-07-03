import { computed } from 'vue'
import { useSearchContext } from '../core/context'

export type UsePaginationOptions = {
  /** How many page links to show either side of the current page. */
  padding?: number
}

export function usePagination(options: UsePaginationOptions = {}) {
  const context = useSearchContext()
  const { padding = 3 } = options

  const currentPage = computed(() => context.results.value?.page ?? context.uiState.value.page ?? 0)
  const nbPages = computed(() => context.results.value?.nbPages ?? 0)
  const isFirstPage = computed(() => currentPage.value <= 0)
  const isLastPage = computed(() => currentPage.value >= nbPages.value - 1)
  const pages = computed(() => pageWindow(currentPage.value, nbPages.value, padding))

  const refine = (page: number) => {
    const clamped = Math.max(0, Math.min(page, Math.max(0, nbPages.value - 1)))
    context.setUiState((previous) => ({ ...previous, page: clamped }))
  }

  const createURL = (page: number) =>
    context.createURL ? context.createURL({ ...context.uiState.value, page }) : undefined

  return { currentPage, nbPages, isFirstPage, isLastPage, pages, refine, createURL }
}

function pageWindow(current: number, total: number, padding: number): number[] {
  if (total <= 0) return []
  const start = Math.max(0, Math.min(current - padding, total - (padding * 2 + 1)))
  const end = Math.min(total - 1, start + padding * 2)
  const window: number[] = []
  for (let page = start; page <= end; page += 1) window.push(page)
  return window
}
