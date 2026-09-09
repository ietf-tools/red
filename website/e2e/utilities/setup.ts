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
import { afterAll, beforeAll, inject } from 'vitest'
import { setup, waitForHydration } from '@nuxt/test-utils/e2e'
import { chromium } from 'playwright-core'
import type { Browser, LaunchOptions, Page } from 'playwright-core'
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

const LAUNCH_OPTIONS: LaunchOptions = {
  headless: !isHeaded,
  slowMo: isHeaded ? HEADED_SLOW_MO_MS : undefined
}

/** Attaches a browser to the shared e2e dev server. */
export const setupNuxtServer = (): Promise<void> =>
  setup({
    browser: true,
    host: inject('e2eBaseUrl'),
    browserOptions: {
      type: 'chromium',
      launch: LAUNCH_OPTIONS
    }
  })

/**
 * Gives a suite whose tests run concurrently its own browser, and an opener to use in place of
 * test-utils' `createPage()`.
 *
 * `setup()` holds the context `createPage()` reads in a single module-level variable, and clears
 * it in an afterEach. Under `test.concurrent` the tests overlap, so whichever finishes first
 * clears the context out from under its still-running siblings and the next `createPage()` fails
 * with "No context is available" — intermittently, because it depends on which moment the
 * teardown lands in. Owning the browser for the file removes the shared mutable state the race
 * needs, so the tests can keep running in parallel.
 *
 * Suites that run their tests one at a time never see the race and should keep to
 * setupNuxtServer() and `createPage()`.
 */
export const setupConcurrentPages = (): ((path: string) => Promise<Page>) => {
  const baseUrl = inject('e2eBaseUrl')
  let browser: Browser | undefined

  beforeAll(async () => {
    browser = await chromium.launch(LAUNCH_OPTIONS)
  })

  afterAll(async () => {
    await browser?.close()
  })

  return async (path: string): Promise<Page> => {
    if (!browser) {
      throw Error('setupConcurrentPages() must be called from a describe body so its beforeAll can launch the browser')
    }
    const page = await browser.newPage()
    const href = new URL(path, baseUrl).href
    await page.goto(href)
    // The app renders client-side, so anything read before hydration finishes is of the shell.
    await waitForHydration(page, href, 'hydration')
    return page
  }
}
