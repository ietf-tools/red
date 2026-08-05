// `npm run test:smoke:login` — obtain a Cloudflare Access session for a protected target
// (staging) by hand, so the smoke specs can run against it without a service token.
//
// Opens a real browser, waits for you to complete the Cloudflare → GitHub SSO flow, then saves
// the resulting session to smoke/.auth/<target>.json. That's the same file a service token
// exchange produces in CI, so nothing downstream cares which way it was made.
//
// If `cloudflared` is on your PATH it's offered first, since it needs no browser window.

import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { chromium } from '@playwright/test'
import { isAuthenticated, readStorageState, writeAuthMode, writeStorageState } from './auth-cloudflare'
import { getTargetConfig } from './targets'

const execFileAsync = promisify(execFile)

const LOGIN_TIMEOUT_MS = 5 * 60 * 1000

const { target, baseURL, needsCloudflareAccess, storageStatePath } = getTargetConfig()

const hasCloudflared = async (): Promise<boolean> => {
  try {
    await execFileAsync('cloudflared', ['--version'])
    return true
  } catch {
    return false
  }
}

/**
 * `cloudflared access login` opens a browser for the SSO flow and caches the token itself; we then
 * read it back out and store it as the CF_Authorization cookie.
 */
const loginViaCloudflared = async (): Promise<boolean> => {
  console.log(`[smoke] cloudflared found — using it to authenticate to ${baseURL}`)
  try {
    await execFileAsync('cloudflared', ['access', 'login', baseURL], { timeout: LOGIN_TIMEOUT_MS })
    const { stdout } = await execFileAsync('cloudflared', ['access', 'token', `-app=${baseURL}`])
    const token = stdout.trim()
    if (!token) {
      return false
    }

    const { host } = new URL(baseURL)
    await writeStorageState(storageStatePath, {
      cookies: [
        {
          name: 'CF_Authorization',
          value: token,
          domain: host,
          path: '/',
          // cloudflared doesn't report the expiry; the JWT carries its own and Cloudflare will
          // reject it once past, which global setup surfaces as "session expired".
          expires: -1,
          httpOnly: true,
          secure: true,
          sameSite: 'None'
        }
      ],
      origins: []
    })
    return true
  } catch (error) {
    console.warn(`[smoke] cloudflared login failed (${error instanceof Error ? error.message : error})`)
    return false
  }
}

const loginViaBrowser = async (): Promise<boolean> => {
  console.log(`[smoke] opening a browser at ${baseURL}`)
  console.log('[smoke] complete the Cloudflare Access / GitHub sign-in; this will save the session automatically.')

  const browser = await chromium.launch({ headless: false })
  const context = await browser.newContext({ baseURL })
  const page = await context.newPage()

  try {
    await page.goto('/', { timeout: LOGIN_TIMEOUT_MS })

    // Done when the app itself is rendered on the target host — not Cloudflare's or GitHub's login
    // domain, and not staging's same-host `/preview` sign-in gate. `#__nuxt` is what distinguishes
    // the app from either.
    const expectedHost = new URL(baseURL).host
    await page.waitForFunction(
      (host) => window.location.host === host && document.querySelector('#__nuxt') !== null,
      expectedHost,
      {
        timeout: LOGIN_TIMEOUT_MS,
        polling: 1000
      }
    )

    const state = await context.storageState()
    await writeStorageState(storageStatePath, state)

    const session = state.cookies.find((cookie) => cookie.name === 'CF_Authorization')
    if (session && session.expires > 0) {
      console.log(`[smoke] session expires ${new Date(session.expires * 1000).toISOString()}`)
    }
    return true
  } finally {
    await context.close()
    await browser.close()
  }
}

const main = async (): Promise<void> => {
  if (!needsCloudflareAccess) {
    console.log(`[smoke] target '${target}' (${baseURL}) isn't behind Cloudflare Access — no login needed.`)
    return
  }

  const existing = await readStorageState(storageStatePath)
  if (existing) {
    const verified = await isAuthenticated(baseURL, { storageState: existing })
    if (verified.ok) {
      console.log(`[smoke] existing session for ${baseURL} is still valid — nothing to do.`)
      return
    }
    console.log('[smoke] existing session is expired; signing in again.')
  }

  const loggedIn = ((await hasCloudflared()) && (await loginViaCloudflared())) || (await loginViaBrowser())
  if (!loggedIn) {
    throw new Error(`Could not obtain a Cloudflare Access session for ${baseURL}`)
  }

  const state = await readStorageState(storageStatePath)
  const verified = await isAuthenticated(baseURL, { storageState: state })
  if (!verified.ok) {
    throw new Error(
      `Saved a session but ${baseURL} still isn't reachable (HTTP ${verified.status} for ${verified.finalUrl})`
    )
  }

  await writeAuthMode(storageStatePath, 'cookie')
  console.log(`[smoke] session saved to ${storageStatePath}`)
  console.log(`[smoke] now run: npm run test:smoke:${target}`)
}

await main()
