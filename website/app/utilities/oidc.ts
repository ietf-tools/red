// Client-side OIDC integration (oidc-client-ts) for the Personalisation feature.
// oidc-client-ts is loaded via a dynamic import() so nothing executes during SSR and it
// stays out of the main bundle. Session state persists in localStorage and renews via the
// refresh token (offline_access scope), so page loads never redirect to the identity
// provider — only an explicit login does.
//
// The core (getUserManager / oidcRestore / oidcLogin / oidcRegister / oidcLogout /
// onOidcSessionEnded / getAccessToken) is
// framework-agnostic. useOidcSession() is a thin Vue composable that wires that core to
// runtimeConfig, the feature flag and the auth store, so components only call
// useOidcSession(). If this file grows, split it into a utilities/oidc/ directory.

import type { User, UserManager } from 'oidc-client-ts'
import { z } from 'zod'
import { useAuthStore } from '~/stores/auth'
import type { Notification } from '~/stores/notifications'
import { useNotificationsStore } from '~/stores/notifications'
import { useFeatureFlags } from '~/utilities/feature-flags'
import { clearReefCaches } from '~/utilities/reef-cache'

export type OidcConfig = {
  authority: string
  clientId: string
  redirectUri: string
  scopes: string[]
  enrollmentUrl: string
}

export type OidcUser = {
  sub: string
  name?: string
  preferredUsername?: string
  email?: string
  picture?: string
}

let userManagerPromise: Promise<UserManager> | undefined
// Retained alongside the manager so the explicit login/register entry points can read
// settings the UserManager doesn't hold, without every caller having to pass config in.
let resolvedConfig: OidcConfig | undefined

const getUserManager = (config: OidcConfig): Promise<UserManager> => {
  if (!userManagerPromise) {
    resolvedConfig = config
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

// Where to return the user once they've signed in. Carried through the login redirect in
// the OIDC `state` parameter: oidc-client-ts keeps this object in local storage keyed by the
// opaque, single-use state value it sends to the identity provider, so the path itself never
// leaves the browser, it can't be confused with a different login attempt, and it's cleaned
// up on callback. That's also why `redirect_uri` stays fixed at oidcHomeUrl — one registered
// redirect URI at the identity provider, whatever page the user signed in from.
const SigninStateSchema = z.object({ returnTo: z.string() })

const getCurrentPath = (): string => `${window.location.pathname}${window.location.search}${window.location.hash}`

// `state` comes back out of web storage, so it's parsed as untrusted input rather than
// trusted as something we wrote. A path is only safe to navigate to if it stays on this
// origin: a leading `//` or `/\` is a protocol-relative URL pointing at another host.
const parseReturnTo = (state: unknown): string | undefined => {
  const { data } = SigninStateSchema.safeParse(state)
  if (!data) {
    return undefined
  }
  const { returnTo } = data
  const isLocalPath = returnTo.startsWith('/') && !returnTo.startsWith('//') && !returnTo.startsWith('/\\')
  return isLocalPath ? returnTo : undefined
}

// Called on client page-load. Completes the login flow if we've just returned from
// the identity provider, otherwise restores an existing session (refreshing via the
// refresh token if the access token has already expired). Never redirects.
//
// `isFreshSignIn` separates the two: it's true only on the page-load that completes a
// login the user just performed, and false when an existing session is restored — so the
// UI can confirm a sign-in without also announcing one on every subsequent page load.
// `returnTo` is the page the user signed in from, and is likewise only ever set on that
// page-load; navigating there is the caller's job (see useOidcSession).
export type OidcRestoreResult = {
  user: OidcUser | null
  isFreshSignIn: boolean
  returnTo?: string
}

export const oidcRestore = async (config: OidcConfig): Promise<OidcRestoreResult> => {
  const userManager = await getUserManager(config)

  if (isCallbackUrl()) {
    const user = await userManager.signinRedirectCallback()
    // Strip the code/state from the URL, staying on the current (root) path.
    window.history.replaceState(null, '', window.location.pathname)
    return { user: toOidcUser(user), isFreshSignIn: true, returnTo: parseReturnTo(user.state) }
  }

  // Logged-in state is based purely on the stored session (id-token claims), so an
  // expired *access* token doesn't report the user as logged out. automaticSilentRenew
  // keeps the access token fresh in the background, and getAccessToken refreshes on demand
  // when an API call needs a token. A *refresh* that the identity provider rejects is a
  // different matter: it discards the session, which reports the user as logged out via the
  // onOidcSessionEnded listener.
  const user = await userManager.getUser()
  return { user: user ? toOidcUser(user) : null, isFreshSignIn: false }
}

// Explicit login — with oidcRegister(), one of only two paths that redirect to the identity
// provider. Relies on oidcRestore() having initialised the manager on page load (see
// Header.vue). Takes no
// arguments: the page to return to is read from the current location here, so that call
// sites can pass this straight to `@click` without a click event becoming an argument.
export const oidcLogin = async (): Promise<void> => {
  if (!userManagerPromise) {
    console.warn('[oidc] login called before initialisation')
    return
  }
  const userManager = await userManagerPromise
  await userManager.signinRedirect({ state: { returnTo: getCurrentPath() } })
}

// Explicit registration. Registration is the same authorization request as a login — same
// client, same PKCE, same redirect URI, same `state` — routed through the identity provider's
// enrolment flow instead of its login flow, via the `next` parameter that flow uses to resume
// whatever it interrupted. So a user who creates an account arrives back signed in, on the
// page they started from, through the ordinary callback in oidcRestore(). (The identity
// provider's own login page offers the same enrolment link, built the same way; this only
// saves the user the trip through it.)
//
// Takes no arguments, for the same reason oidcLogin() doesn't.
export const oidcRegister = async (): Promise<void> => {
  if (!userManagerPromise || !resolvedConfig) {
    console.warn('[oidc] register called before initialisation')
    return
  }
  const { enrollmentUrl } = resolvedConfig
  const userManager = await userManagerPromise
  const { OidcClient } = await import('oidc-client-ts')
  // UserManager has no public request builder, but the OidcClient underneath it does, and
  // sharing the manager's settings shares its state store: createSigninRequest() writes the
  // same PKCE/state entry signinRedirect() would, which signinRedirectCallback() then reads
  // back. Sharing the metadata service reuses the already-fetched discovery document.
  const client = new OidcClient(userManager.settings, userManager.metadataService)
  const request = await client.createSigninRequest({
    request_type: 'si:r',
    state: { returnTo: getCurrentPath() }
  })
  const url = new URL(enrollmentUrl)
  // Relative, matching the form the identity provider generates for this parameter itself —
  // it resolves `next` against its own origin.
  const { pathname, search } = new URL(request.url)
  url.searchParams.set('next', `${pathname}${search}`)
  window.location.assign(url.href)
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

let sessionEndedRegistered = false

// Registers the callback to run whenever the local session ends without us asking — a
// refresh token that the identity provider rejects, or background renewal giving up. Both
// funnel through removeUser(), which raises userUnloaded, so one listener covers every
// route. Idempotent: only the first call registers, so a feature flag toggling back on
// doesn't stack duplicate listeners.
export const onOidcSessionEnded = async (config: OidcConfig, onEnded: () => void): Promise<void> => {
  if (sessionEndedRegistered) {
    return
  }
  sessionEndedRegistered = true
  const userManager = await getUserManager(config)
  userManager.events.addUserUnloaded(onEnded)
  userManager.events.addSilentRenewError((error) => {
    console.warn('[oidc] background renewal failed; ending session', error)
    void userManager.removeUser()
  })
}

// Returns a valid access token for authenticated API calls, refreshing via the refresh
// token if the current one has expired. Returns undefined if not logged in or if the
// refresh fails. This is the primitive for calling authenticated APIs (e.g. Reef).
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
      user = null
    }
    if (!user) {
      // A refresh the identity provider won't honour is terminal — the refresh token is
      // expired or revoked and no later attempt can succeed. Discard the stored session so
      // the UI stops reporting a logged-in user (and so it doesn't survive a page reload,
      // where getUser() would hand the same dead record straight back). removeUser() raises
      // userUnloaded, which is what tells the auth store to clear — see onOidcSessionEnded.
      await userManager.removeUser()
      return undefined
    }
  }
  return user.access_token
}

// The toast confirming a sign-in the user has just completed. Not dismissable — a
// confirmation reports what just happened, so there's nothing for the user to be finished
// with, and it has to appear on every sign-in. `foreground` so screen readers announce it:
// it's the response to an action the user just took.
const signedInNotification = (user: OidcUser): Notification => {
  const { name, preferredUsername, email } = user
  const identity = name ?? preferredUsername ?? email
  return {
    id: 'signed-in',
    title: 'Signed in',
    description: identity ? `You're signed in as ${identity}.` : undefined,
    delayMs: 0,
    // Short: a confirmation of something the user just did, with nothing in it to act on and
    // barely a line to read. It's also reporting a state that stays visible in the header
    // afterwards, so nothing is lost by missing it.
    durationMs: 5_000,
    position: 'top',
    type: 'foreground'
  }
}

// Vue composable: call once from a component that's always mounted (Header.vue). Restores
// the OIDC session (or completes a login callback) on the client when the `oidc` feature
// flag is on, and feeds the reactive auth store. Gated + onMounted so SSR stays anonymous;
// reactive + immediate so it fires whether the flag is already set or toggled on later.
export const useOidcSession = (): void => {
  const { public: config } = useRuntimeConfig()
  const featureFlags = useFeatureFlags()
  const authStore = useAuthStore()
  const notificationsStore = useNotificationsStore()

  onMounted(() => {
    watch(
      () => featureFlags.value.oidc,
      (enabled) => {
        if (!enabled) {
          return
        }
        const oidcConfig = {
          authority: config.oidcIssuerUri,
          clientId: config.oidcClientId,
          redirectUri: window.location.origin + config.oidcHomeUrl,
          scopes: config.oidcScopes.split(' ').filter(Boolean),
          enrollmentUrl: config.oidcEnrollmentUrl
        }
        void onOidcSessionEnded(oidcConfig, () => {
          authStore.clearUser()
          // Whatever this tab remembered about the reader's own ratings, subscriptions and sets was
          // theirs, so it goes when their session does. This runs on every way a session can end,
          // including an explicit sign-out: signoutRedirect discards the stored user before it
          // navigates, which is what raises the event this listens to.
          clearReefCaches()
        })
        void oidcRestore(oidcConfig)
          .then(({ user, isFreshSignIn, returnTo }) => {
            authStore.hasCheckedAuth = true
            if (!user) {
              return
            }
            authStore.setUser(user)
            if (!isFreshSignIn) {
              return
            }
            notificationsStore.add(signedInNotification(user))
            if (returnTo) {
              // A client-side route rather than a location change, so the stores — and so
              // the toast queued just above — survive the hop back to the original page.
              void navigateTo(returnTo, { replace: true })
            }
          })
          .catch((error) => {
            console.error('[oidc] restore failed', error)
            // Still an answer, and the only one anything downstream can act on: the restore was
            // attempted and this tab has no session. Left unset, everything that waits for the
            // check — AuthWall, useReefAuthSettled — would sit at its loading state for the life
            // of the page because the provider was unreachable.
            authStore.hasCheckedAuth = true
          })
      },
      { immediate: true }
    )
  })
}
