// Playwright runner for the *deployment* smoke suite in smoke/ — tests that run against an
// already-deployed environment (staging, prod, or a local dev server you started yourself).
//
// This is separate from the vitest e2e suite in e2e/, which uses @nuxt/test-utils to boot its own
// Nuxt dev server and so can only ever test locally. Specs here are named `*.spec.ts` rather than
// `*.e2e.ts` precisely so vitest's `e2e` project glob (`**/*.e2e.ts`) doesn't pick them up.
//
//   npm run test:smoke:prod       — no auth needed
//   npm run test:smoke:staging    — needs a Cloudflare Access session; see smoke/README.md
//   npm run test:smoke:local      — against a dev server you already have running
//
// See smoke/targets.ts for SMOKE_TARGET / SMOKE_BASE_URL, and smoke/README.md for everything else.

import { defineConfig, devices } from '@playwright/test'
import { getTargetConfig } from './smoke/targets.ts'

const { target, baseURL, storageStatePath } = getTargetConfig()

const isCI = Boolean(process.env.CI)

export default defineConfig({
  testDir: './smoke',
  testMatch: '**/*.spec.ts',

  // Resolves Cloudflare Access auth and waits for EXPECT_WEBSITE_VERSION to be live.
  globalSetup: './smoke/global-setup.ts',

  // These hit a real deployment over the network, so give pages room; the RFC pages in
  // mobile-overflow.spec.ts are some of the largest documents on the site.
  timeout: 60_000,
  expect: { timeout: 15_000 },

  // A network blip shouldn't produce a red deployment check, but a genuine failure shouldn't be
  // retried away locally where you're debugging it.
  retries: isCI ? 2 : 0,
  workers: isCI ? 4 : 6,
  fullyParallel: true,

  // Don't let a stray `test.only` silently shrink the suite in CI.
  forbidOnly: isCI,

  reporter: isCI
    ? [['github'], ['html', { outputFolder: 'smoke/report', open: 'never' }], ['list']]
    : [['html', { outputFolder: 'smoke/report', open: 'never' }], ['list']],

  use: {
    baseURL,
    // Written by global setup — holds the Cloudflare Access session cookie for targets that need
    // one, and is an empty state otherwise. Always present so this reference can't dangle.
    storageState: storageStatePath,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    // Deployed environments are the point of this suite, so never silently accept a bad cert.
    ignoreHTTPSErrors: false
  },

  projects: [
    {
      name: `chromium-${target}`,
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          // /dev/shm is small on CI runners and Chromium's headless shell crashes under
          // concurrent load without this.
          args: ['--disable-dev-shm-usage']
        }
      }
    }
  ]
})
