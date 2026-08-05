// The deployment's own health endpoints, in server/api/v1/.

import { expect, test } from './fixtures.ts'
import { getTargetConfig } from './targets.ts'

const { target, baseURL } = getTargetConfig()

test('healthcheck reports ok for the expected origin', async ({ request }) => {
  const response = await request.get('/api/v1/healthcheck.json')
  expect(response.status()).toBe(200)

  const body = await response.json()
  expect(body.ok).toBe(true)
  expect(body.timestampIso).toBeTruthy()

  // Catches a pod deployed with the wrong NUXT_PUBLIC_SITE_BASE — the app would then build
  // absolute URLs (canonical links, sitemap, meta previews) pointing at another environment.
  expect(body.publicSiteUrlOrigin).toBe(baseURL)
})

test('systemcheck responds with the expected shape', async ({ request }) => {
  // systemcheck.json HEADs ~10 URLs on its own public origin, so it's slower than a plain route.
  test.slow()

  const response = await request.get('/api/v1/systemcheck.json')
  const body = await response.json()

  expect(typeof body.ok).toBe('boolean')
  expect(body.timestampIso).toBeTruthy()

  if (target === 'staging') {
    // Staging sits behind Cloudflare Access, and systemcheck's internal requests to its own
    // public origin carry no Access credentials — so `ok` is false there for reasons that have
    // nothing to do with this deployment. Assert only that the endpoint itself is alive.
    expect([200, 500]).toContain(response.status())
    return
  }

  expect(response.status(), body.message ?? 'systemcheck failed').toBe(200)
  expect(body.ok, body.message ?? 'systemcheck failed').toBe(true)
})
