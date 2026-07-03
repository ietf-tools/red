import { nextTick } from 'vue'

const FOCUSABLE_SELECTOR =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

/** Deterministic focus moves, awaiting a DOM update so freshly rendered targets exist. */
export function useFocusManagement() {
  const focusElement = async (element: HTMLElement | null | undefined) => {
    if (!element) return
    await nextTick()
    element.focus()
  }

  const focusFirstWithin = async (container: HTMLElement | null | undefined) => {
    if (!container) return
    await nextTick()
    container.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)?.focus()
  }

  return { focusElement, focusFirstWithin }
}
