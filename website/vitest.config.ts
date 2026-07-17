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
          environment: 'node'
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
