// Connection config for the search-index quality tests. Deliberately standalone — it does NOT
// read nuxt.config; the hosts are hardcoded here and selected by a target flag so the suite can
// point at production or staging independently of the app.
//
//   SEARCH_INDEX_TARGET=prod|staging   (default: prod)
//   NUXT_PUBLIC_TYPESENSE_HOST         overrides the host for the chosen target
//   NUXT_PUBLIC_TYPESENSE_API_KEY      overrides the API key
//
// The API keys are search-only and already public (they ship to browsers on the live sites), so
// hardcoding them here is fine.

export type Target = 'prod' | 'staging'

type TypesenseConfig = {
  target: Target
  host: string
  apiKey: string
}

const TARGETS: Record<Target, { host: string; apiKey: string }> = {
  prod: { host: 'typesense.ietf.org', apiKey: '0C8Exv9grP2li1fwQeg34nPtKfccC3Qa' },
  staging: { host: 'typesense.staging.ietf.org', apiKey: '2Ic06V287miUyJ32ee25q0ccXK0Dr3RO' }
}

export const getTarget = (): Target => (process.env.SEARCH_INDEX_TARGET === 'staging' ? 'staging' : 'prod')

/** Resolves host + search API key for the chosen target, honouring env overrides. */
export const getTypesenseConfig = (): TypesenseConfig => {
  const target = getTarget()
  const defaults = TARGETS[target]
  return {
    target,
    host: process.env.NUXT_PUBLIC_TYPESENSE_HOST ?? defaults.host,
    apiKey: process.env.NUXT_PUBLIC_TYPESENSE_API_KEY ?? defaults.apiKey
  }
}
