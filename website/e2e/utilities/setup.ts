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
 *
 * Set `E2E_HEADED=1` to run the browser visibly and slowed down, for watching a behavioural
 * suite drive the app. Use `npm run test:e2e:headed`, which also serialises the run — the
 * suites are concurrent, so otherwise several windows compete for the screen at once.
 *
 * Headed runs are for behaviour, not for the screenshot suites: a visible browser rasterises
 * text differently from a headless one, the same way a different platform does, so captures
 * taken this way disagree with baselines recorded headless.
 */
import { inject } from 'vitest'
import { setup } from '@nuxt/test-utils/e2e'
import { isTruthyEnv } from './screenshot'

// Declared here as well as in global-setup.ts, which sits outside the type-checked
// program and so cannot contribute the augmentation the suites need.
declare module 'vitest' {
  interface ProvidedContext {
    e2eBaseUrl: string
  }
}

/** How far to slow a headed run down, so a reader can follow what the browser is doing. */
const HEADED_SLOW_MO_MS = 250

const isHeaded = isTruthyEnv(process.env.E2E_HEADED)

/** Attaches a browser to the shared e2e dev server. */
export const setupNuxtServer = (): Promise<void> =>
  setup({
    browser: true,
    host: inject('e2eBaseUrl'),
    browserOptions: {
      type: 'chromium',
      launch: {
        headless: !isHeaded,
        slowMo: isHeaded ? HEADED_SLOW_MO_MS : undefined
      }
    }
  })
