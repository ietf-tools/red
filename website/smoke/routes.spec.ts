// Key routes respond, with the right content type and the trailing-slash canonicalisation the
// site guarantees in docs/MAJOR_CHANGES.md.

import { expect, test } from './fixtures.ts'
import { infoPath } from './fixtures.ts'

type Route = {
  path: string
  contentType: RegExp
}

// Drawn from app/pages/ plus the generated feeds. Deliberately a handful of representative
// routes, not an exhaustive crawl — this is a smoke check, and the sitemap covers breadth.
const ROUTES: Route[] = [
  { path: '/', contentType: /text\/html/ },
  { path: infoPath('rfc9000'), contentType: /text\/html/ },
  { path: '/rfc-index/', contentType: /text\/html/ },
  { path: '/status-changes/', contentType: /text\/html/ },
  { path: '/search', contentType: /text\/html/ },
  { path: '/about/rfc-editor/', contentType: /text\/html/ },
  { path: '/robots.txt', contentType: /text\/plain/ },
  { path: '/sitemap.xml', contentType: /application\/xml/ },
  { path: '/rfcrss.xml', contentType: /application\/xml/ }
]

// Paths whose canonical form has a trailing slash, so the bare form must redirect to it.
const REDIRECT_TO_TRAILING_SLASH = ['/info/rfc9000', '/rfc-index', '/status-changes']

for (const { path, contentType } of ROUTES) {
  test(`GET ${path} responds`, async ({ request }) => {
    const response = await request.get(path)
    expect(response.status()).toBe(200)

    const { 'content-type': responseContentType } = response.headers()
    expect(responseContentType).toMatch(contentType)
  })
}

for (const path of REDIRECT_TO_TRAILING_SLASH) {
  test(`GET ${path} redirects to its trailing-slash form`, async ({ request }) => {
    const response = await request.get(path, { maxRedirects: 0 })

    expect([301, 302, 307, 308]).toContain(response.status())

    const { location } = response.headers()
    if (typeof location !== 'string') {
      throw new Error(`Expected a Location header on the redirect for ${path}`)
    }
    expect(new URL(location, response.url()).pathname).toBe(`${path}/`)
  })
}
