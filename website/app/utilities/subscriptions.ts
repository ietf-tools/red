// Feature logic for a user's notification subscriptions — the presentation of the list on the
// account page, and the reading and writing of the one subscription that matters on an RFC page.
//
// Reef models a subscription as a `kind` plus a free-form `params` object whose shape varies
// by kind, so turning that pair into something a person can read — or building one for a
// particular RFC — is feature logic and lives here rather than in the component or in the API
// client (~/utilities/reef).

import { useAuthStore } from '~/stores/auth'
import type { Notification } from '~/stores/notifications'
import {
  createSubscription,
  deleteSubscription,
  getSubscriptions,
  type Subscription,
  type SubscriptionKind
} from '~/utilities/reef'

// Wording taken from the KindEnum descriptions in reef_api.yaml.
const KIND_LABELS: Record<SubscriptionKind, string> = {
  rfc: 'A specific RFC',
  new_rfc: 'Any new RFC',
  by_status: 'New RFC by status',
  obsoleted: 'RFC obsoleted or made historic',
  subject_tag: 'RFC with a subject tag',
  set: 'Set of RFCs'
}

// Falls back to the raw kind so a subscription created by a newer Reef than this build knows
// about still shows something rather than an empty row.
export const subscriptionLabel = ({ kind }: Subscription): string => KIND_LABELS[kind] ?? kind

const formatParamValue = (value: unknown): string => {
  if (Array.isArray(value)) {
    return value.map(formatParamValue).join(', ')
  }
  if (typeof value === 'string') {
    return value
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  return JSON.stringify(value) ?? ''
}

// `params` is typed as `unknown` in the spec, so narrow it before reading anything off it.
// Returns undefined when there's nothing worth showing, which is the common case for the
// new_rfc kind, and the caller then renders the label on its own.
export const subscriptionParamsSummary = ({ params }: Subscription): string | undefined => {
  if (params === null || typeof params !== 'object' || Array.isArray(params)) {
    return undefined
  }

  const summary = Object.entries(params)
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .map(([key, value]) => `${key}: ${formatParamValue(value)}`)
    .join(', ')

  return summary === '' ? undefined : summary
}

// Newest first, so a subscription the user just created appears at the top of the list.
export const sortSubscriptions = (subscriptions: Subscription[]): Subscription[] =>
  subscriptions.toSorted((a, b) => b.created_at.localeCompare(a.created_at))

// --- Subscribing to one RFC -------------------------------------------------------------
//
// The `rfc` kind — "Changes to one specific RFC" — is the only kind an RFC page deals in, and
// the only one Red creates. Everything below is about that one kind.

// Reef canonicalizes document identifiers, so the compact form is what we send — the same form
// ratingKey builds in ~/utilities/ratings, spelled out again here so the two features don't have
// to share a helper named after one of them.
const rfcSubscriptionKey = (rfcNumber: number): string => `rfc${rfcNumber}`

// The spec types `params` as a free-form object, so the shape per kind isn't something the
// generated types can check. For the `rfc` kind it's the canonical document id under `rfc`, and
// this is the single place that knows that — both writing one and recognising one go through here.
export const rfcSubscriptionParams = (rfcNumber: number): { rfc: string } => ({
  rfc: rfcSubscriptionKey(rfcNumber)
})

// `params` is `unknown` on the way back, so narrow it before reading anything off it rather than
// trusting the shape we happen to write. A subscription of another kind never matches, even if it
// carries an `rfc` param of its own, because the kind is checked first.
export const isRFCSubscription = ({ kind, params }: Subscription, rfcNumber: number): boolean => {
  if (kind !== 'rfc') {
    return false
  }
  if (params === null || typeof params !== 'object' || Array.isArray(params) || !('rfc' in params)) {
    return false
  }
  return params.rfc === rfcSubscriptionKey(rfcNumber)
}

// The caller's subscription to one RFC, or undefined if they aren't subscribed to it. Reef has no
// per-RFC subscription endpoint, so this filters the full list — which is also what the account
// page fetches, and the only read the API offers.
export const findRFCSubscription = (subscriptions: Subscription[], rfcNumber: number): Subscription | undefined =>
  subscriptions.find((subscription) => isRFCSubscription(subscription, rfcNumber))

// --- Cache ------------------------------------------------------------------------------
//
// The reader's own subscriptions, remembered for the lifetime of the tab. Because Reef answers
// only with the caller's whole list, an RFC page otherwise pays a full list fetch to settle one
// yes/no question, and pays it again on the next RFC — so this is a bigger saving than the rating
// cache in ~/utilities/ratings, which it's otherwise modelled on.
//
// sessionStorage rather than localStorage because the tab is the honest lifetime: within one tab
// the only things that change this list are subscribeToRFC and unsubscribeFromRFC above, and both
// write through, so a hit needs no expiry to be trusted. A subscription the same reader changes in
// another tab or on another device is not picked up until this tab reloads — that bounded
// staleness is what the per-tab lifetime buys, and it's why this isn't localStorage.
//
// The account page deliberately doesn't read through here: it calls getSubscriptions directly,
// because a page whose whole purpose is to show the list should show Reef's current one. It only
// lists, so there's no write there that could leave this stale.

const SUBSCRIPTIONS_CACHE_PREFIX = 'red.reef.subscriptions.'

// Keyed by the OIDC subject, because sessionStorage outlives a sign-out: two readers using the
// same tab in turn must not be shown each other's subscriptions. Signed out there's nothing to key
// by and nothing worth caching either, since the list is per-caller — so callers fall through to
// Reef, which for an anonymous caller means a 401 rather than a list.
const subscriptionsCacheKey = (): string | undefined => {
  const { user } = useAuthStore()
  return user === undefined ? undefined : `${SUBSCRIPTIONS_CACHE_PREFIX}${user.sub}`
}

// Checks the fields anything actually reads off a cached subscription, not the whole schema.
// `kind` is only checked as a string rather than against KindEnum, deliberately: subscriptionLabel
// above already tolerates a kind this build doesn't know, and discarding the cache over one would
// be a stricter reaction than the live path has.
const isCachedSubscription = (value: unknown): value is Subscription =>
  typeof value === 'object' &&
  value !== null &&
  'id' in value &&
  typeof value.id === 'number' &&
  'kind' in value &&
  typeof value.kind === 'string' &&
  'created_at' in value &&
  typeof value.created_at === 'string'

const readCachedSubscriptions = (): Subscription[] | undefined => {
  if (!import.meta.client) {
    return undefined
  }
  try {
    const key = subscriptionsCacheKey()
    if (key === undefined) {
      return undefined
    }
    const stored = window.sessionStorage.getItem(key)
    if (stored === null) {
      return undefined
    }
    const parsed: unknown = JSON.parse(stored)
    // An empty array is a real cached answer — "this reader has no subscriptions" — and worth a
    // hit of its own, or every visit by a non-subscriber would ask Reef again.
    if (Array.isArray(parsed) && parsed.every(isCachedSubscription)) {
      return parsed
    }
    // Written by an older version of this code, or edited by hand. Discard it and ask Reef, which
    // is the only thing that can restore a list we're able to trust.
    window.sessionStorage.removeItem(key)
    return undefined
  } catch (error) {
    // sessionStorage throws outright when browser storage is disabled, and JSON.parse throws on a
    // truncated value. Either way the cache is unavailable, which is a miss rather than a failure.
    console.warn('[subscriptions] unable to read the cached subscriptions; asking Reef instead', error)
    return undefined
  }
}

const writeCachedSubscriptions = (subscriptions: Subscription[]): void => {
  if (!import.meta.client) {
    return
  }
  try {
    const key = subscriptionsCacheKey()
    if (key === undefined) {
      return
    }
    window.sessionStorage.setItem(key, JSON.stringify(subscriptions))
  } catch (error) {
    // Storage disabled, or the quota is full. Nothing to do about it: the next read is a miss and
    // Reef answers as it did before this cache existed. Never rethrown: this runs after Reef has
    // already accepted the change, so a failure to remember it locally is not a failed write.
    console.warn('[subscriptions] unable to cache the subscriptions', error)
  }
}

// Keep a cached list in step with a change Reef has already accepted. A miss is left alone rather
// than seeded from the one subscription at hand: a list of one would be a hit, and would then
// answer for every other RFC as though the reader had no other subscriptions. Leaving it absent
// costs one fetch, which comes back with this change already in it.
const patchCachedSubscriptions = (patch: (subscriptions: Subscription[]) => Subscription[]): void => {
  const cached = readCachedSubscriptions()
  if (cached === undefined) {
    return
  }
  writeCachedSubscriptions(patch(cached))
}

// The caller's whole subscription list, from the tab's cache once it has been read or written
// already. Browser-only, like the rest of the Reef client, and it needs a token — the list is
// per-caller, so an anonymous call has nothing to return.
const getUserSubscriptions = async (signal?: AbortSignal): Promise<Subscription[]> => {
  const cached = readCachedSubscriptions()
  if (cached !== undefined) {
    return cached
  }

  const subscriptions = await getSubscriptions(signal)
  writeCachedSubscriptions(subscriptions)
  return subscriptions
}

export const getUserRFCSubscription = async (
  rfcNumber: number,
  signal?: AbortSignal
): Promise<Subscription | undefined> => findRFCSubscription(await getUserSubscriptions(signal), rfcNumber)

// Subscribe the caller to one RFC. The created subscription comes back with its server-assigned
// id, which is the only handle unsubscribing has — so callers need to hold on to it.
export const subscribeToRFC = async (rfcNumber: number, signal?: AbortSignal): Promise<Subscription> => {
  const created = await createSubscription({ kind: 'rfc', params: rfcSubscriptionParams(rfcNumber) }, signal)
  // Only once Reef has accepted it. A POST that fails, or one aborted because the reader unticked
  // the box, rejects before this line, so the tab never caches a subscription Reef isn't holding.
  patchCachedSubscriptions((subscriptions) => [...subscriptions, created])
  return created
}

// Takes the subscription rather than an RFC number, because DELETE is by id and the id is only
// known from the subscription that created or loaded it.
export const unsubscribeFromRFC = async (subscription: Subscription, signal?: AbortSignal): Promise<void> => {
  const { id } = subscription
  await deleteSubscription(id, signal)
  patchCachedSubscriptions((subscriptions) => subscriptions.filter((item) => item.id !== id))
}

// --- Announcements ----------------------------------------------------------------------
//
// Only failures are announced here. A subscribe or unsubscribe that works needs no toast: the
// checkbox stays on screen with its state flipped, and a screen reader reads that from
// aria-checked. A failure is different — the checkbox is put back the way it was, so without this
// the only visible result of pressing it would be nothing happening.

const subscriptionFailureNotificationId = (rfcNumber: number): string =>
  `rfc-subscription.${rfcSubscriptionKey(rfcNumber)}`

export const subscriptionFailedNotification = (rfcNumber: number, wasSubscribing: boolean): Notification => ({
  // One id per RFC whichever way the toggle was going, so a retry replaces the previous message
  // rather than stacking a second toast on top of it.
  id: subscriptionFailureNotificationId(rfcNumber),
  title: wasSubscribing ? 'Unable to subscribe' : 'Unable to unsubscribe',
  description: wasSubscribing
    ? `You have not been subscribed to RFC ${rfcNumber}. Please try again.`
    : `You are still subscribed to RFC ${rfcNumber}. Please try again.`,
  delayMs: 0,
  position: 'top',
  // A direct result of the reader pressing the checkbox, so it's announced rather than left to be
  // noticed.
  type: 'foreground'
})
