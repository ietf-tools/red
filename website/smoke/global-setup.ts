// Runs once before the smoke specs. Two jobs:
//
//   1. Establish a Cloudflare Access session for the target (see smoke/auth-cloudflare.ts).
//   2. Gate on the deployed version, when EXPECT_WEBSITE_VERSION is set.
//
// The version gate exists because the deploy workflow's `staging` job only *dispatches*
// deploy.yml in ietf-tools/infra-k8s and returns — the k8s rollout is asynchronous, so without
// waiting we'd silently smoke-test the previous build.

import { request as playwrightRequest } from '@playwright/test'
import {
  establishCloudflareAccessSession,
  getServiceTokenHeaders,
  readStorageState,
  type StorageState
} from './auth-cloudflare.ts'
import { getTargetConfig } from './targets.ts'

const DEFAULT_VERSION_TIMEOUT_MS = 10 * 60 * 1000
const VERSION_POLL_INTERVAL_MS = 10 * 1000

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// The served HTML references built assets under `app.buildAssetsDir`, which nuxt.config.ts sets to
// `/_nuxt/${version}/`. That makes the live build's version readable straight off the homepage.
const buildAssetsDirFor = (version: string) => `/_nuxt/${version}/`

const findLiveVersion = (html: string): string | undefined => {
  const match = html.match(/\/_nuxt\/([^/"'\s]+)\//)
  return match?.[1]
}

type WaitOptions = {
  baseURL: string
  expectedVersion: string
  storageState: StorageState | undefined
  headers: Record<string, string> | undefined
}

const waitForDeployedVersion = async ({
  baseURL,
  expectedVersion,
  storageState,
  headers
}: WaitOptions): Promise<void> => {
  const { SMOKE_VERSION_TIMEOUT_MS } = process.env
  const timeoutMs = SMOKE_VERSION_TIMEOUT_MS ? Number(SMOKE_VERSION_TIMEOUT_MS) : DEFAULT_VERSION_TIMEOUT_MS
  const expectedAssetsDir = buildAssetsDirFor(expectedVersion)
  const deadline = Date.now() + timeoutMs

  const context = await playwrightRequest.newContext({ baseURL, storageState, extraHTTPHeaders: headers })
  try {
    let liveVersion: string | undefined
    let attempt = 0

    while (Date.now() < deadline) {
      attempt += 1
      // Cache-bust so we see the pod's current build rather than an edge-cached document.
      const response = await context.get(`/?smoke-version-check=${attempt}`)
      const html = await response.text()

      if (html.includes(expectedAssetsDir)) {
        console.log(`[smoke] ${baseURL} is serving the expected version ${expectedVersion}`)
        return
      }

      liveVersion = findLiveVersion(html) ?? liveVersion
      console.log(
        `[smoke] waiting for ${expectedVersion} on ${baseURL} — currently serving ${liveVersion ?? 'unknown'} ` +
          `(attempt ${attempt}, ${Math.round((deadline - Date.now()) / 1000)}s left)`
      )
      await delay(VERSION_POLL_INTERVAL_MS)
    }

    throw new Error(
      `Timed out after ${Math.round(timeoutMs / 1000)}s waiting for ${baseURL} to serve version ` +
        `${expectedVersion}; it is serving ${liveVersion ?? 'an unrecognised version'}. ` +
        'The k8s rollout may still be in progress or may have failed.'
    )
  } finally {
    await context.dispose()
  }
}

export default async (): Promise<void> => {
  const { target, baseURL, needsCloudflareAccess, storageStatePath } = getTargetConfig()
  console.log(`[smoke] target '${target}' → ${baseURL}`)

  const authMode = await establishCloudflareAccessSession({ baseURL, storageStatePath, needsCloudflareAccess })
  if (needsCloudflareAccess) {
    console.log(`[smoke] Cloudflare Access auth mode: ${authMode}`)
  }

  const { EXPECT_WEBSITE_VERSION } = process.env
  if (EXPECT_WEBSITE_VERSION === undefined || EXPECT_WEBSITE_VERSION === '') {
    return
  }

  await waitForDeployedVersion({
    baseURL,
    expectedVersion: EXPECT_WEBSITE_VERSION,
    storageState: authMode === 'cookie' ? await readStorageState(storageStatePath) : undefined,
    headers: authMode === 'header' ? getServiceTokenHeaders() : undefined
  })
}
