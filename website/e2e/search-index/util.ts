/** Runs `worker` over `items` with a bounded number of concurrent tasks, preserving order. */
export const mapPool = async <T, R>(items: T[], limit: number, worker: (item: T) => Promise<R>): Promise<R[]> => {
  const results = Array.from<R>({ length: items.length })
  let next = 0
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++
      results[index] = await worker(items[index]!)
    }
  })
  await Promise.all(runners)
  return results
}
