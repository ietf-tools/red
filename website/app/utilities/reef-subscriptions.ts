// Feature logic for a user's notification subscriptions — the presentation of the list on the
// account page, the reading and writing of the one subscription that matters on an RFC page, and
// the model that page binds its subscribe dialog to.
//
// Reef models a subscription as a `kind` plus a free-form `params` object whose shape varies
// by kind, so turning that pair into something a person can read — or building one for a
// particular RFC — is feature logic and lives here rather than in the component or in the API
// client (~/utilities/reef).

import { ref, watch, type Ref } from 'vue'
import { z } from 'zod'
import { useAuthStore } from '~/stores/auth'
import { useNotificationsStore, type Notification } from '~/stores/notifications'
import { REEF_CACHE_PREFIX } from '~/utilities/reef-cache'
import {
  createSubscription,
  deleteSubscription,
  getSubscriptions,
  useReefRequests,
  watchReefUserDocument,
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

// `params` is typed as `unknown` in the spec, so it's parsed rather than trusted — a record of
// unknown values is the most any kind's params can be relied on to be, which is enough to list
// them. Returns undefined when there's nothing worth showing, which is the common case for the
// new_rfc kind, and the caller then renders the label on its own.
const SubscriptionParamsSchema = z.record(z.string(), z.unknown())

export const subscriptionParamsSummary = ({ params }: Subscription): string | undefined => {
  const { data } = SubscriptionParamsSchema.safeParse(params)
  if (data === undefined) {
    return undefined
  }

  const summary = Object.entries(data)
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
// ratingKey builds in ~/utilities/reef-ratings, spelled out again here so the two features don't
// have to share a helper named after one of them.
const rfcSubscriptionKey = (rfcNumber: number): string => `rfc${rfcNumber}`

// The spec types `params` as a free-form object, so the shape per kind isn't something the
// generated types can check. For the `rfc` kind it's the canonical document id under `rfc`, and
// this is the single place that knows that — both writing one and recognising one go through here.
export const rfcSubscriptionParams = (rfcNumber: number): { rfc: string } => ({
  rfc: rfcSubscriptionKey(rfcNumber)
})

// The same shape on the way back in, parsed rather than trusted to be what we happen to write.
// Params Reef holds alongside this one don't stop it matching — parsing ignores what it isn't
// looking for — and `rfc` is all that's read off the result.
const RFCSubscriptionParamsSchema = z.object({ rfc: z.string() })

// A subscription of another kind never matches, even if it carries an `rfc` param of its own,
// because the kind is checked first.
export const isRFCSubscription = ({ kind, params }: Subscription, rfcNumber: number): boolean => {
  if (kind !== 'rfc') {
    return false
  }
  const { data } = RFCSubscriptionParamsSchema.safeParse(params)
  return data?.rfc === rfcSubscriptionKey(rfcNumber)
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
// cache in ~/utilities/reef-ratings, which it's otherwise modelled on.
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

const SUBSCRIPTIONS_CACHE_PREFIX = `${REEF_CACHE_PREFIX}subscriptions.`

// Keyed by the OIDC subject, because sessionStorage outlives a sign-out: two readers using the
// same tab in turn must not be shown each other's subscriptions. Signed out there's nothing to key
// by and nothing worth caching either, since the list is per-caller — so callers fall through to
// Reef, which for an anonymous caller means a 401 rather than a list.
const subscriptionsCacheKey = (): string | undefined => {
  const { user } = useAuthStore()
  return user === undefined ? undefined : `${SUBSCRIPTIONS_CACHE_PREFIX}${user.sub}`
}

// What a subscription is, mirroring the generated Subscription schema field for field. The
// `satisfies` is why it's worth writing out: it stops compiling if this ever covers less than the
// generated type, so regenerating the client after a spec change points here instead of leaving a
// hand-written schema to drift quietly from reef_api.yaml.
//
// Every field, not only the ones something reads, because parsing drops what it doesn't declare and
// a cached subscription is written back as it was read. A schema listing only what's read would
// persist records with `params` missing — the field the RFC page settles its checkbox from.
const SubscriptionSchema = z.object({
  id: z.number(),
  // Checked against the enum, which is stricter than the live path: subscriptionLabel tolerates a
  // kind this build doesn't know, but a cached record this build can't model in full is one it would
  // be writing back, so it's refetched rather than trusted. That costs one fetch, and only for a
  // reader holding a subscription created by a newer Reef than this build.
  kind: z.enum(['rfc', 'new_rfc', 'by_status', 'obsoleted', 'subject_tag', 'set']),
  params: z.unknown().optional(),
  set: z.number().nullable().optional(),
  verified: z.boolean(),
  created_at: z.string()
}) satisfies z.ZodType<Subscription>

const CachedSubscriptionsSchema = z.array(SubscriptionSchema)

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
    const { data, error } = CachedSubscriptionsSchema.safeParse(JSON.parse(stored))
    if (error) {
      // Written by an older version of this code, or edited by hand. Discard it and ask Reef, which
      // is the only thing that can restore a list we're able to trust.
      window.sessionStorage.removeItem(key)
      return undefined
    }
    // An empty array is a real cached answer — "this reader has no subscriptions" — and worth a
    // hit of its own, or every visit by a non-subscriber would ask Reef again.
    return data
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

// --- The model an RFC page binds ---------------------------------------------------------

// Whether this reader is subscribed to one RFC, as a model for the subscribe dialog's checkbox:
// loaded from Reef when the reader or the RFC changes, and written back when they tick or untick
// it. False while nobody is signed in.
//
// A boolean is all the dialog needs, so the subscription itself stays in here — its server-assigned
// id is the only handle unsubscribing has, and nothing outside this module has any use for it.
export const useUserRFCSubscription = (rfcNumber: () => number): Ref<boolean> => {
  const notificationsStore = useNotificationsStore()
  const requests = useReefRequests()

  const isSubscribedToThisRFC = ref(false)

  // Reef's own answer, playing the same part for the subscription that syncedRating plays for the
  // rating: undefined is "not subscribed", and comparing it against the checkbox is what tells a
  // load apart from the reader ticking the box.
  let syncedSubscription: Subscription | undefined

  const load = async (rfc: number, isAuthenticated: boolean) => {
    // Subscriptions are per-user and the token is what identifies them, so there's nothing to ask
    // for while logged out. Reset rather than leave the previous reader's tick behind.
    if (!isAuthenticated) {
      requests.abortLoad()
      syncedSubscription = undefined
      isSubscribedToThisRFC.value = false
      return
    }

    const outcome = await requests.load((signal) => getUserRFCSubscription(rfc, signal))

    if (outcome.status === 'failed') {
      // Same call as the account page's list, and the same treatment as a failed rating load: the
      // row still renders, and the checkbox stays unticked rather than claiming a state we couldn't
      // confirm.
      console.error('Unable to load your subscription for this RFC.', outcome.error)
      return
    }
    if (outcome.status !== 'done') {
      return
    }
    // Before the assignment, so the write watcher — which fires on the next tick — already sees
    // this as Reef's own answer and leaves it alone.
    syncedSubscription = outcome.value
    isSubscribedToThisRFC.value = outcome.value !== undefined
  }

  const persist = async (isSubscribed: boolean) => {
    // Reef holding a subscription is what "subscribed" means, so comparing the checkbox against
    // syncedSubscription is the whole test for whether there's anything to write. Equal means this
    // change came from a load, or from the revert below putting the box back.
    if (isSubscribed === (syncedSubscription !== undefined)) {
      return
    }

    const rfc = rfcNumber()
    const subscriptionToRemove = syncedSubscription

    // Resolves to what Reef is holding afterwards, which is what syncedSubscription becomes: the
    // created subscription, or nothing once it has been deleted.
    const outcome = await requests.write(async (signal): Promise<Subscription | undefined> => {
      if (isSubscribed) {
        // Returned rather than discarded: the id Reef assigns here is what unsubscribing needs.
        return await subscribeToRFC(rfc, signal)
      }
      // Unticking with nothing to remove can't happen — that's the equality check above — but the
      // type allows it, and then there's nothing to ask Reef for.
      if (subscriptionToRemove !== undefined) {
        await unsubscribeFromRFC(subscriptionToRemove, signal)
      }
      return undefined
    })

    if (outcome.status === 'superseded') {
      return
    }
    if (outcome.status === 'failed') {
      // Put the checkbox back to what Reef is actually holding — the watcher sees it match
      // syncedSubscription and doesn't try to write it out again — and say so. Without the toast the
      // box would simply spring back with nothing to explain it.
      isSubscribedToThisRFC.value = syncedSubscription !== undefined
      notificationsStore.add(subscriptionFailedNotification(rfc, isSubscribed))
      console.error('Unable to change your subscription for this RFC.', outcome.error)
      return
    }

    syncedSubscription = outcome.value
  }

  watchReefUserDocument(rfcNumber, (rfc, isAuthenticated) => {
    void load(rfc, isAuthenticated)
  })

  watch(isSubscribedToThisRFC, (isSubscribed) => {
    void persist(isSubscribed)
  })

  return isSubscribedToThisRFC
}
