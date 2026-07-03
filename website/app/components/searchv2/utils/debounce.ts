export type Debounced<A extends unknown[]> = ((...args: A) => void) & {
  cancel: () => void
  flush: () => void
}

/** Trailing-edge debounce with cancel/flush. Vue-only, no external dependency. */
export function debounce<A extends unknown[]>(fn: (...args: A) => void, waitMs: number): Debounced<A> {
  let timer: ReturnType<typeof setTimeout> | undefined
  let pendingArgs: A | undefined

  const invoke = () => {
    timer = undefined
    if (pendingArgs) {
      const args = pendingArgs
      pendingArgs = undefined
      fn(...args)
    }
  }

  const debounced = ((...args: A) => {
    pendingArgs = args
    if (timer !== undefined) clearTimeout(timer)
    timer = setTimeout(invoke, waitMs)
  }) as Debounced<A>

  debounced.cancel = () => {
    if (timer !== undefined) clearTimeout(timer)
    timer = undefined
    pendingArgs = undefined
  }

  debounced.flush = () => {
    if (timer !== undefined) invoke()
  }

  return debounced
}
