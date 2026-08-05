// Cloudflare Access authentication for the smoke suite.
//
// The staging site sits behind Cloudflare Access with a GitHub IdP, which neither CI nor a
// repeated local run can click through. Both usable paths converge on the same artifact: a
// Playwright storageState file holding the `CF_Authorization` cookie for the target host, so the
// specs themselves know nothing about Cloudflare.
//
//   CI      — a Cloudflare Access *service token* (`CF-Access-Client-Id` / `-Secret` headers) is
//             exchanged once here for that cookie. See smoke/README.md for the one-time setup.
//   Human   — `npm run test:smoke:login` opens a real browser for the SSO flow and saves the
//             same file (see smoke/login.ts).
//
// Why exchange the service token for a cookie instead of just setting `use.extraHTTPHeaders`:
// extraHTTPHeaders are sent to *every* origin a page touches — static.ietf.org, Matomo,
// typesense.staging.ietf.org, account.ietf.org — which would leak the service token secret to
// third parties. A cookie is scoped to the target host alone. When the cookie exchange doesn't
// work we fall back to injecting the headers via request interception filtered to the target
// origin, which preserves that property.

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { request as playwrightRequest } from '@playwright/test'

/** How the specs should authenticate to Cloudflare Access for this run. */
export type AuthMode =
  /** Target isn't behind Cloudflare Access, or the session cookie in storageState is enough. */
  | 'cookie'
  /** Cookie exchange unavailable — inject service token headers, scoped to the target origin. */
  | 'header'
  /** No authentication needed at all (prod, local). */
  | 'none'

type Cookie = {
  name: string
  value: string
  domain: string
  path: string
  expires: number
  httpOnly: boolean
  secure: boolean
  sameSite: 'Strict' | 'Lax' | 'None'
}

export type StorageState = {
  cookies: Cookie[]
  origins: { origin: string; localStorage: { name: string; value: string }[] }[]
}

const CF_AUTHORIZATION_COOKIE = 'CF_Authorization'

const EMPTY_STORAGE_STATE: StorageState = { cookies: [], origins: [] }

/** Sibling of the storageState file, recording which AuthMode global setup settled on. */
const authModePath = (storageStatePath: string) => storageStatePath.replace(/\.json$/, '.mode.json')

export const hasServiceTokenCredentials = (): boolean => {
  const { CF_ACCESS_CLIENT_ID, CF_ACCESS_CLIENT_SECRET } = process.env
  return Boolean(CF_ACCESS_CLIENT_ID) && Boolean(CF_ACCESS_CLIENT_SECRET)
}

export const getServiceTokenHeaders = (): Record<string, string> => {
  const { CF_ACCESS_CLIENT_ID, CF_ACCESS_CLIENT_SECRET } = process.env
  if (CF_ACCESS_CLIENT_ID === undefined || CF_ACCESS_CLIENT_SECRET === undefined) {
    throw new Error('CF_ACCESS_CLIENT_ID and CF_ACCESS_CLIENT_SECRET must both be set')
  }
  return {
    'CF-Access-Client-Id': CF_ACCESS_CLIENT_ID,
    'CF-Access-Client-Secret': CF_ACCESS_CLIENT_SECRET
  }
}

export const writeStorageState = async (storageStatePath: string, state: StorageState): Promise<void> => {
  await mkdir(dirname(storageStatePath), { recursive: true })
  await writeFile(storageStatePath, JSON.stringify(state, null, 2), 'utf-8')
}

export const writeAuthMode = async (storageStatePath: string, mode: AuthMode): Promise<void> => {
  await mkdir(dirname(storageStatePath), { recursive: true })
  await writeFile(authModePath(storageStatePath), JSON.stringify({ mode }, null, 2), 'utf-8')
}

/** Read back the AuthMode global setup settled on. Called from worker processes. */
export const readAuthMode = async (storageStatePath: string): Promise<AuthMode> => {
  try {
    const contents = await readFile(authModePath(storageStatePath), 'utf-8')
    const { mode } = JSON.parse(contents)
    if (mode === 'cookie' || mode === 'header' || mode === 'none') {
      return mode
    }
  } catch {
    // Missing or unreadable — global setup hasn't run, or the target needs no auth.
  }
  return 'none'
}

export const readStorageState = async (storageStatePath: string): Promise<StorageState | undefined> => {
  try {
    const contents = await readFile(storageStatePath, 'utf-8')
    return JSON.parse(contents)
  } catch {
    return undefined
  }
}

/**
 * Fetches `/` and reports whether we landed on the app itself.
 *
 * Checking the response is the app, rather than merely a 200 on the right host, matters here:
 * Cloudflare Access bounces to `<team>.cloudflareaccess.com` (caught by the host check), but
 * staging also has a same-host gate that redirects unauthenticated page requests to `/preview` to
 * start the sign-in. Only the app's own build assets distinguish the real thing from either.
 */
export const isAuthenticated = async (
  baseURL: string,
  options: { storageState?: StorageState; headers?: Record<string, string> } = {}
): Promise<{ ok: boolean; status: number; finalUrl: string }> => {
  const { storageState, headers } = options
  const context = await playwrightRequest.newContext({
    baseURL,
    storageState,
    extraHTTPHeaders: headers,
    ignoreHTTPSErrors: false
  })
  try {
    const response = await context.get('/')
    const finalUrl = response.url()
    const expectedHost = new URL(baseURL).host
    const actualHost = new URL(finalUrl).host
    const isApp = response.ok() && (await response.text()).includes('/_nuxt/')
    return { ok: isApp && actualHost === expectedHost, status: response.status(), finalUrl }
  } finally {
    await context.dispose()
  }
}

/**
 * Exchanges the service token for a `CF_Authorization` cookie, verifying that the cookie alone is
 * then sufficient. Returns undefined when Cloudflare doesn't hand one back, in which case the
 * caller should fall back to header injection.
 */
const exchangeServiceTokenForCookie = async (baseURL: string): Promise<StorageState | undefined> => {
  const headers = getServiceTokenHeaders()
  const context = await playwrightRequest.newContext({ baseURL, extraHTTPHeaders: headers })

  let state: StorageState
  try {
    const response = await context.get('/')
    if (!response.ok()) {
      throw new Error(
        `Cloudflare Access rejected the service token: HTTP ${response.status()} for ${response.url()}. ` +
          'Check that the staging Access application has a policy with action "Service Auth" including this token.'
      )
    }
    state = await context.storageState()
  } finally {
    await context.dispose()
  }

  const hasCookie = state.cookies.some((cookie) => cookie.name === CF_AUTHORIZATION_COOKIE)
  if (!hasCookie) {
    return undefined
  }

  // The cookie exists, but only counts if it works on its own (without the token headers).
  const verified = await isAuthenticated(baseURL, { storageState: state })
  return verified.ok ? state : undefined
}

type EstablishOptions = {
  baseURL: string
  storageStatePath: string
  needsCloudflareAccess: boolean
}

/**
 * Ensures a usable Cloudflare Access session exists for the target and that the storageState file
 * on disk is present and valid (Playwright's `use.storageState` requires the file to exist, so we
 * always write one, even when empty). Returns the AuthMode the specs should use.
 */
export const establishCloudflareAccessSession = async ({
  baseURL,
  storageStatePath,
  needsCloudflareAccess
}: EstablishOptions): Promise<AuthMode> => {
  if (!needsCloudflareAccess) {
    await writeStorageState(storageStatePath, EMPTY_STORAGE_STATE)
    await writeAuthMode(storageStatePath, 'none')
    return 'none'
  }

  if (hasServiceTokenCredentials()) {
    const state = await exchangeServiceTokenForCookie(baseURL)
    if (state) {
      await writeStorageState(storageStatePath, state)
      await writeAuthMode(storageStatePath, 'cookie')
      return 'cookie'
    }

    // No usable cookie came back. Send the token headers per-request instead, scoped to the
    // target origin by the fixture in smoke/fixtures.ts so the secret never reaches third parties.
    console.warn(
      `[smoke] Cloudflare Access did not return a usable ${CF_AUTHORIZATION_COOKIE} cookie for the ` +
        'service token; falling back to origin-scoped header injection.'
    )
    await writeStorageState(storageStatePath, EMPTY_STORAGE_STATE)
    await writeAuthMode(storageStatePath, 'header')
    return 'header'
  }

  // No service token: expect a session saved earlier by `npm run test:smoke:login`.
  const state = await readStorageState(storageStatePath)
  if (!state) {
    throw new Error(
      `No Cloudflare Access session for ${baseURL}.\n` +
        '  Interactively: npm run test:smoke:login\n' +
        '  Or set CF_ACCESS_CLIENT_ID and CF_ACCESS_CLIENT_SECRET to use a service token.'
    )
  }

  const verified = await isAuthenticated(baseURL, { storageState: state })
  if (!verified.ok) {
    throw new Error(
      `Cloudflare Access session for ${baseURL} is missing or expired ` +
        `(HTTP ${verified.status} for ${verified.finalUrl}).\n` +
        '  Refresh it with: npm run test:smoke:login'
    )
  }

  await writeAuthMode(storageStatePath, 'cookie')
  return 'cookie'
}
