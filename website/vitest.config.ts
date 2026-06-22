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
      }
    ]
  }
}))
