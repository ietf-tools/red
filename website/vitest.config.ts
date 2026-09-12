import { defineConfig } from 'vitest/config'
import { defineVitestProject } from '@nuxt/test-utils/config'

export default defineConfig(async () => ({
  test: {
    projects: [
      await defineVitestProject({
        test: {
          name: 'unit',
          include: ['**/*.test.ts'],
          environment: 'nuxt'
        }
      }),
      {
        test: {
          name: 'e2e',
          include: ['**/*.e2e.ts'],
          environment: 'node',
          // Starts the one dev server every e2e suite attaches to. Without it each
          // suite would launch its own, and in dev mode those all serve from the same
          // `.nuxt` build directory and collide. See e2e/utilities/global-setup.ts.
          globalSetup: ['./e2e/utilities/global-setup.ts'],
          // Concurrent tests each open a page against that one dev server. Above this, a page could
          // be queued past its hydration wait when the other suites were loading pages too. Blank
          // tiles in the layout captures are handled by the height ceiling in
          // e2e/utilities/screenshot.ts rather than by concurrency.
          maxConcurrency: 4
        }
      },
      {
        // Search-index quality tests hit external Typesense API, so they're kept out of the
        // default `test:unittests`/`test:e2e` runs. Invoke explicitly via
        // `npm run test:unittests:search-index`.
        test: {
          name: 'search-index',
          include: ['e2e/search-index/**/*.search-index.ts'],
          environment: 'node',
          // A cold Typesense query plus generous per-case network latency.
          testTimeout: 30_000,
          hookTimeout: 30_000,
          // Cases hit the live API; cap concurrent in-flight requests (it.concurrent.each).
          maxConcurrency: 8
        }
      }
    ]
  }
}))
