import { sleep } from "./sleep.ts"

export const gc = async () => {
  if (!global.gc) return
  await global.gc({ execution: 'async' })
  await sleep(10)
  await global.gc({ execution: 'async' })
  return
}

