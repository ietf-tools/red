// Connection config for the deployment smoke tests. Deliberately standalone — it does NOT read
// nuxt.config; the hosts are hardcoded here and selected by a target flag so the suite can point
// at a deployed environment independently of the app's own runtime config. Same approach as
// e2e/search-index/config.ts.
//
//   SMOKE_TARGET=local|staging|prod   (default: staging)
//   SMOKE_BASE_URL                    overrides the chosen target's base URL (e.g. demo)
//
// `local` assumes a dev server is already running — the suite never starts or restarts one.

import { fileURLToPath } from 'node:url'

export type Target = 'local' | 'staging' | 'prod'

type TargetConfig = {
  target: Target
  baseURL: string
  /** Whether this target sits behind Cloudflare Access and so needs an auth step. */
  needsCloudflareAccess: boolean
  /** Where the Cloudflare Access session (a Playwright storageState) is cached. */
  storageStatePath: string
}

const TARGETS: Record<Target, { baseURL: string; needsCloudflareAccess: boolean }> = {
  local: { baseURL: 'http://localhost:3000', needsCloudflareAccess: false },
  staging: { baseURL: 'https://www.staging.rfc-editor.org', needsCloudflareAccess: true },
  prod: { baseURL: 'https://www.rfc-editor.org', needsCloudflareAccess: false }
}

const isTarget = (value: string | undefined): value is Target => value !== undefined && value in TARGETS

export const getTarget = (): Target => {
  const { SMOKE_TARGET } = process.env
  if (SMOKE_TARGET === undefined || SMOKE_TARGET === '') {
    return 'staging'
  }
  if (!isTarget(SMOKE_TARGET)) {
    throw new Error(`SMOKE_TARGET must be one of ${Object.keys(TARGETS).join('|')}, got '${SMOKE_TARGET}'`)
  }
  return SMOKE_TARGET
}

const smokeDir = fileURLToPath(new URL('.', import.meta.url))

/** Resolves base URL and auth requirements for the chosen target, honouring env overrides. */
export const getTargetConfig = (): TargetConfig => {
  const target = getTarget()
  const defaults = TARGETS[target]
  const { SMOKE_BASE_URL } = process.env
  const baseURL = SMOKE_BASE_URL !== undefined && SMOKE_BASE_URL !== '' ? SMOKE_BASE_URL : defaults.baseURL

  return {
    target,
    // Trailing slashes would double up when joined with a path, so normalise them away.
    baseURL: baseURL.replace(/\/+$/, ''),
    needsCloudflareAccess: defaults.needsCloudflareAccess,
    storageStatePath: `${smokeDir}.auth/${target}.json`
  }
}

/** RFCs whose overflow failures are known and accepted, e.g. SMOKE_ALLOW_OVERFLOW=rfc9618,rfc9880 */
export const getAllowedOverflowRfcs = (): string[] => {
  const { SMOKE_ALLOW_OVERFLOW } = process.env
  if (SMOKE_ALLOW_OVERFLOW === undefined || SMOKE_ALLOW_OVERFLOW === '') {
    return []
  }
  return SMOKE_ALLOW_OVERFLOW.split(',')
    .map((rfc) => rfc.trim().toLowerCase())
    .filter(Boolean)
}
