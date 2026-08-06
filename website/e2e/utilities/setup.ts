/**
 * Shared `setup()` for e2e suites that drive a browser against the app.
 *
 * Suites attach to the single dev server started by e2e/utilities/global-setup.ts
 * instead of each starting one of their own. Passing `host` makes test-utils skip both
 * the build and the server launch, so a suite owns nothing that another suite could
 * contend for and the e2e files can run in parallel. See global-setup.ts for what goes
 * wrong when every suite runs its own dev server.
 *
 * Each suite still gets its own browser, which is per-worker state and safe to
 * parallelise.
 */
import { inject } from 'vitest'
import { setup } from '@nuxt/test-utils/e2e'

// Declared here as well as in global-setup.ts, which sits outside the type-checked
// program and so cannot contribute the augmentation the suites need.
declare module 'vitest' {
  interface ProvidedContext {
    e2eBaseUrl: string
  }
}

/** Attaches a browser to the shared e2e dev server. */
export const setupNuxtServer = (): Promise<void> =>
  setup({
    browser: true,
    host: inject('e2eBaseUrl')
  })
