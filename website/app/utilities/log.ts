const cache: Record<string, true> = {}

export const logOnce = (...args: unknown[]) => {
  const key = JSON.stringify(args)
  if (cache[key]) {
    return
  }
  cache[key] = true
  console.log(...args)
}
