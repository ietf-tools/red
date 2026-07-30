// Client-side OIDC integration (oidc-client-ts) for the Personalisation feature.
// oidc-client-ts is loaded via a dynamic import() so nothing executes during SSR and it
// stays out of the main bundle. Session state persists in localStorage and renews via the
// refresh token (offline_access scope), so page loads never redirect to the identity
// provider — only an explicit login does.
//
// The core (getUserManager / oidcRestore / oidcLogin / oidcLogout / getAccessToken) is
// framework-agnostic. useOidcSession() is a thin Vue composable that wires that core to
// runtimeConfig, the feature flag and the auth store, so components only call
// useOidcSession(). If this file grows, split it into a utilities/oidc/ directory.

import type { User, UserManager } from 'oidc-client-ts'
import { useAuthStore } from '~/stores/auth'
import { useFeatureFlags } from '~/utilities/feature-flags'

export type OidcConfig = {
  authority: string
  clientId: string
  redirectUri: string
  scopes: string[]
}

export type OidcUser = {
  sub: string
  name?: string
  preferredUsername?: string
  email?: string
  picture?: string
}

let userManagerPromise: Promise<UserManager> | undefined

const getUserManager = (config: OidcConfig): Promise<UserManager> => {
  if (!userManagerPromise) {
    userManagerPromise = (async () => {
      const { UserManager, WebStorageStateStore } = await import('oidc-client-ts')
      return new UserManager({
        authority: config.authority,
        client_id: config.clientId,
        redirect_uri: config.redirectUri,
        scope: config.scopes.join(' '),
        response_type: 'code',
        automaticSilentRenew: true,
        post_logout_redirect_uri: config.redirectUri,
        userStore: new WebStorageStateStore({ store: window.localStorage })
      })
    })()
  }
  return userManagerPromise
}

const toOidcUser = (user: User): OidcUser => {
  const { profile } = user
  return {
    sub: profile.sub,
    name: profile.name,
    preferredUsername: profile.preferred_username,
    email: profile.email,
    picture: profile.picture
  }
}

const isCallbackUrl = (): boolean => {
  const params = new URLSearchParams(window.location.search)
  return params.has('code') && params.has('state')
}

// Called on client page-load. Completes the login flow if we've just returned from
// the identity provider, otherwise restores an existing session (refreshing via the
// refresh token if the access token has already expired). Never redirects.
export const oidcRestore = async (config: OidcConfig): Promise<OidcUser | null> => {
  const userManager = await getUserManager(config)

  if (isCallbackUrl()) {
    const user = await userManager.signinRedirectCallback()
    // Strip the code/state from the URL, staying on the current (root) path.
    window.history.replaceState(null, '', window.location.pathname)
    return toOidcUser(user)
  }

  // Logged-in state is based purely on the stored session (id-token claims), so an
  // expired *access* token doesn't report the user as logged out. automaticSilentRenew
  // keeps the access token fresh in the background; on-demand refresh for API calls is
  // handled when we actually need a token (see getAccessToken, added when APIs are wired).
  const user = await userManager.getUser()
  return user ? toOidcUser(user) : null
}

// Explicit login — the only path that redirects to the identity provider. Relies on
// oidcRestore() having initialised the manager on page load (see Header.vue).
export const oidcLogin = async (): Promise<void> => {
  if (!userManagerPromise) {
    console.warn('[oidc] login called before initialisation')
    return
  }
  const userManager = await userManagerPromise
  await userManager.signinRedirect()
}

// Sign out via the identity provider's end-session endpoint: clears the local tokens
// AND ends the Authentik SSO session, then returns to post_logout_redirect_uri (root).
export const oidcLogout = async (): Promise<void> => {
  if (!userManagerPromise) {
    return
  }
  const userManager = await userManagerPromise
  await userManager.signoutRedirect()
}

// Returns a valid access token for authenticated API calls, refreshing via the refresh
// token if the current one has expired. Returns undefined if not logged in or if the
// refresh fails. This is the primitive for calling authenticated APIs (e.g. Pink).
export const getAccessToken = async (): Promise<string | undefined> => {
  if (!userManagerPromise) {
    return undefined
  }
  const userManager = await userManagerPromise
  let user = await userManager.getUser()
  if (!user) {
    return undefined
  }
  if (user.expired === true) {
    try {
      user = await userManager.signinSilent()
    } catch (error) {
      console.warn('[oidc] token refresh failed', error)
      return undefined
    }
  }
  return user?.access_token
}

// Vue composable: call once from a component that's always mounted (Header.vue). Restores
// the OIDC session (or completes a login callback) on the client when the `oidc` feature
// flag is on, and feeds the reactive auth store. Gated + onMounted so SSR stays anonymous;
// reactive + immediate so it fires whether the flag is already set or toggled on later.
export const useOidcSession = (): void => {
  const { public: config } = useRuntimeConfig()
  const featureFlags = useFeatureFlags()
  const authStore = useAuthStore()

  onMounted(() => {
    watch(
      () => featureFlags.value.oidc,
      (enabled) => {
        if (!enabled) {
          return
        }
        void oidcRestore({
          authority: config.oidcIssuerUri,
          clientId: config.oidcClientId,
          redirectUri: window.location.origin + config.oidcHomeUrl,
          scopes: config.oidcScopes.split(' ').filter(Boolean)
        })
          .then((user) => {
            authStore.hasCheckedAuth = true
            if (user) {
              authStore.setUser(user)
            }
          })
          .catch((error) => {
            console.error('[oidc] restore failed', error)
          })
      },
      { immediate: true }
    )
  })
}
