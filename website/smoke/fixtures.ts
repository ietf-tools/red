// Shared fixtures and helpers for the smoke specs.
//
// Kept self-contained (no imports from app/ or shared/) for the same reason
// e2e/search-index/ is: these specs run under the Playwright runner with no Nuxt context, and
// pulling app modules in would drag their whole dependency chain and tsconfig project membership
// along with it.

import { expect, test as base, type Page } from '@playwright/test'
import { getServiceTokenHeaders, readAuthMode } from './auth-cloudflare'
import { getTargetConfig } from './targets'

const { baseURL, storageStatePath } = getTargetConfig()

// One read per worker process rather than per test.
let authModePromise: ReturnType<typeof readAuthMode> | undefined
const getAuthMode = () => {
  authModePromise ??= readAuthMode(storageStatePath)
  return authModePromise
}

/**
 * Console errors and failed requests attributable to the site itself. Third-party noise (blocked
 * Matomo, font CDN hiccups) is excluded by origin so it can't fail a deployment check.
 */
export type PageIssues = string[]

type SmokeFixtures = {
  pageIssues: PageIssues
}

export const test = base.extend<SmokeFixtures>({
  // In the fallback auth mode there's no session cookie, so the Cloudflare Access service token
  // is sent as headers instead — scoped to the target origin here so the secret never reaches
  // static.ietf.org, Matomo, Typesense or Authentik.
  context: async ({ context }, use) => {
    if ((await getAuthMode()) === 'header') {
      const headers = getServiceTokenHeaders()
      await context.route(`${baseURL}/**`, async (route) => {
        await route.continue({ headers: { ...route.request().headers(), ...headers } })
      })
    }
    await use(context)
  },

  // The `request` fixture doesn't go through the browser context, so it needs the same auth
  // applied independently. Every request it makes is to the target origin, so headers are safe
  // here without route filtering.
  request: async ({ playwright }, use) => {
    const mode = await getAuthMode()
    const context = await playwright.request.newContext({
      baseURL,
      storageState: mode === 'cookie' ? storageStatePath : undefined,
      extraHTTPHeaders: mode === 'header' ? getServiceTokenHeaders() : undefined
    })
    await use(context)
    await context.dispose()
  },

  pageIssues: async ({ page }, use) => {
    const issues: PageIssues = []

    page.on('pageerror', (error) => {
      issues.push(`pageerror: ${error.message}`)
    })

    page.on('console', (message) => {
      if (message.type() !== 'error') {
        return
      }
      // Errors logged from third-party scripts aren't this deployment's problem. An empty
      // location URL means the message came from the page's own inline context, so keep those.
      const { url } = message.location()
      if (url === '' || url.startsWith(baseURL)) {
        issues.push(`console.error: ${message.text()}`)
      }
    })

    page.on('requestfailed', (request) => {
      if (!request.url().startsWith(baseURL)) {
        return
      }
      issues.push(`requestfailed: ${request.method()} ${request.url()} — ${request.failure()?.errorText}`)
    })

    await use(issues)
  }
})

export { expect }

/** The smallest common device width (iPhone SE). See measureHorizontalOverflow. */
export const MOBILE_VIEWPORT = { width: 320, height: 667 } as const

/**
 * Horizontal overflow in px — how much wider the document is than its viewport. A positive value
 * means the window has a horizontal scrollbar, i.e. a broken mobile layout.
 *
 * This must be measured against a *locked* viewport, never Playwright's mobile device emulation:
 * with `isMobile: true` Chromium shrink-to-fits, expanding `window.innerWidth` to the content
 * width so an overflowing page reports no overflow at all. The locked viewport keeps the layout
 * viewport fixed, which is what exposes real overflow.
 */
export const measureHorizontalOverflow = (page: Page): Promise<number> =>
  page.evaluate(() => {
    const { scrollWidth, clientWidth } = document.documentElement
    return scrollWidth - clientWidth
  })

/** Path of an RFC's info page, e.g. `rfc9000` → `/info/rfc9000/` (trailing slash is canonical). */
export const infoPath = (rfcId: string) => `/info/${rfcId}/`
