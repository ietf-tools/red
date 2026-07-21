// Client-side OIDC integration (oidc-client-ts) for the Personalisation feature.
// Framework-agnostic: no Nuxt/Vue imports here. oidc-client-ts is loaded via a
// dynamic import() so nothing executes during SSR and it stays out of the main bundle.
//
// Session state persists in localStorage and renews via the refresh token
// (offline_access scope), so page loads never redirect to the identity provider —
// only an explicit login does.

import type { User, UserManager } from 'oidc-client-ts'

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
