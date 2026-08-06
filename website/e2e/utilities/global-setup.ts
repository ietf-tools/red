/**
 * Boots one Nuxt dev server for the whole e2e project.
 *
 * WHY
 * ---
 * `@nuxt/test-utils`' `setup({ dev: true })` starts a dev server per suite, and in dev
 * mode every one of those serves from the project's single `.nuxt` build directory.
 * Run the suites concurrently and they race there, so all but one die with
 * `ENOENT: mkdir '.nuxt/dev'` or `Server process exited before becoming ready`. The
 * per-suite `buildDir` option does not help: test-utils only applies it when `dev` is
 * false, and the spawned `nuxi _dev` child re-reads nuxt.config.ts from the project
 * root anyway, so no override handed to `setup()` ever reaches the running server.
 *
 * Starting the server once here removes the contention rather than working around it.
 * Suites then attach with test-utils' `host` option, which skips building and starting
 * a server altogether, leaving nothing for them to race over — so vitest can run the
 * e2e files in parallel. It is also less work overall: one dev server instead of one
 * per file.
 *
 * Set `E2E_BASE_URL` to test against a server you are already running; this file then
 * starts nothing and leaves that server alone.
 */
import { spawn } from 'node:child_process'
import { createServer } from 'node:net'
import { fileURLToPath } from 'node:url'
import type { TestProject } from 'vitest/node'

const ROOT_DIR = fileURLToPath(new URL('../../', import.meta.url))

const HOST = '127.0.0.1'

/** Long enough for a cold Vite dev start on a loaded CI runner. */
const SERVER_START_TIMEOUT_MS = 180_000

const READINESS_POLL_INTERVAL_MS = 500

/** Grace period for the dev server to exit on its own before it is killed outright. */
const SHUTDOWN_GRACE_MS = 5_000

/**
 * Nuxt serves a placeholder document containing this marker while the dev server is
 * still warming up, so a plain 200 is not on its own proof that the app is ready.
 */
const LOADING_MARKER = '__NUXT_LOADING__'

declare module 'vitest' {
  interface ProvidedContext {
    e2eBaseUrl: string
  }
}

/** Asks the OS for a free port by binding to zero and reading back what it assigned. */
const findFreePort = (): Promise<number> =>
  new Promise((resolve, reject) => {
    const server = createServer()
    server.on('error', reject)
    server.listen(0, HOST, () => {
      const address = server.address()
      if (address === null || typeof address === 'string') {
        server.close()
        reject(new Error('could not determine a free port'))
        return
      }
      const { port } = address
      server.close(() => resolve(port))
    })
  })

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

const isServing = async (baseUrl: string): Promise<boolean> => {
  try {
    const response = await fetch(baseUrl, { signal: AbortSignal.timeout(READINESS_POLL_INTERVAL_MS * 4) })
    if (!response.ok) {
      return false
    }
    return !(await response.text()).includes(LOADING_MARKER)
  } catch {
    return false
  }
}

const waitForServer = async (baseUrl: string, hasExited: () => boolean): Promise<void> => {
  const deadline = Date.now() + SERVER_START_TIMEOUT_MS
  while (Date.now() < deadline) {
    if (hasExited()) {
      throw new Error(`the e2e dev server exited before becoming ready (see its output above)`)
    }
    if (await isServing(baseUrl)) {
      return
    }
    await delay(READINESS_POLL_INTERVAL_MS)
  }
  throw new Error(`the e2e dev server did not become ready at ${baseUrl} within ${SERVER_START_TIMEOUT_MS}ms`)
}

export default async ({ provide }: TestProject) => {
  const existingBaseUrl = process.env.E2E_BASE_URL
  if (existingBaseUrl) {
    console.log(`[e2e] using the server already running at ${existingBaseUrl}`)
    provide('e2eBaseUrl', existingBaseUrl)
    return () => {}
  }

  const port = await findFreePort()
  const baseUrl = `http://${HOST}:${port}/`

  // `nuxt dev` rather than a preview build: the suites depend on the `$development`
  // route rules in nuxt.config.ts, notably the `/api/v1/**` proxy the app loads data
  // through.
  const server = spawn('npx', ['--no', 'nuxt', 'dev', '--port', String(port), '--host', HOST], {
    cwd: ROOT_DIR,
    stdio: ['ignore', 'inherit', 'inherit'],
    // Its own process group, so shutdown can take the whole Vite/Nitro tree down with
    // it rather than orphaning children.
    detached: true,
    env: { ...process.env, NODE_ENV: 'development' }
  })

  let exited = false
  server.on('exit', () => {
    exited = true
  })

  console.log(`[e2e] starting a dev server at ${baseUrl}`)
  try {
    await waitForServer(baseUrl, () => exited)
  } catch (error) {
    if (!exited && server.pid !== undefined) {
      process.kill(-server.pid, 'SIGKILL')
    }
    throw error
  }
  console.log(`[e2e] dev server ready at ${baseUrl}`)

  provide('e2eBaseUrl', baseUrl)

  return async () => {
    const { pid } = server
    if (exited || pid === undefined) {
      return
    }
    process.kill(-pid, 'SIGTERM')

    const deadline = Date.now() + SHUTDOWN_GRACE_MS
    while (!exited && Date.now() < deadline) {
      await delay(READINESS_POLL_INTERVAL_MS)
    }
    if (!exited) {
      process.kill(-pid, 'SIGKILL')
    }
  }
}
