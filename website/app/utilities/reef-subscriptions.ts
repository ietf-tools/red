// Feature logic for a user's notification subscriptions — the presentation of the list on the
// account page, and the model an RFC page binds its subscribe dialog to.
//
// Reef models a subscription as a `kind` plus a free-form `params` object whose shape varies
// by kind, so turning that pair into something a person can read — or building one for a
// particular document — is feature logic and lives here rather than in the component or in the API
// client (~/utilities/reef).
//
// Reading whether this reader subscribes to a document happens in ~/stores/reef, along with every
// other per-reader answer. Reef used to offer only the caller's whole list, so an RFC page paid a
// full list fetch to settle one yes/no; now the answer arrives per document with everything else.

import { computed, toValue, type MaybeRefOrGetter, type WritableComputedRef } from 'vue'
import { z } from 'zod'
import { useNotificationsStore, type Notification } from '~/stores/notifications'
import { useReefStore } from '~/stores/reef'
import { createSubscription, deleteSubscription, type Subscription, type SubscriptionKind } from '~/utilities/reef'
import { reefDocumentKey, useReefDocument } from '~/utilities/reef-documents'

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

// --- Subscribing to one document ----------------------------------------------------------
//
// The `rfc` kind — "Changes to one specific RFC" — is the only kind an RFC page deals in, and
// the only one Red creates. Everything below is about that one kind.

// The spec types `params` as a free-form object, so the shape per kind isn't something the
// generated types can check. For the `rfc` kind it's the canonical document id under `rfc`, and
// this is the single place that knows that.
export const rfcSubscriptionParams = (doc: string): { rfc: string } => ({ rfc: doc })

// --- Announcements ----------------------------------------------------------------------
//
// Only failures are announced here. A subscribe or unsubscribe that works needs no toast: the
// checkbox stays on screen with its state flipped, and a screen reader reads that from
// aria-checked. A failure is different — the checkbox is put back the way it was, so without this
// the only visible result of pressing it would be nothing happening.

export const subscriptionFailedNotification = (rfcNumber: number, wasSubscribing: boolean): Notification => ({
  // One id per document whichever way the toggle was going, so a retry replaces the previous
  // message rather than stacking a second toast on top of it.
  id: `rfc-subscription.${reefDocumentKey(rfcNumber)}`,
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

// --- Writing ------------------------------------------------------------------------------

/**
 * Subscribe this reader to one document, or unsubscribe them.
 *
 * The checkbox moves first and is put back if Reef refuses. Subscribing has no id until Reef
 * assigns one, which is why the store holds `isSubscribed` apart from `yourSubscriptionId`:
 * between the tick and the response the reader is subscribed as far as the page is concerned, and
 * unsubscribing is what needs the id.
 */
export const writeUserRFCSubscription = async (rfcNumber: number, isSubscribed: boolean): Promise<void> => {
  const reefStore = useReefStore()
  const notificationsStore = useNotificationsStore()
  const doc = reefDocumentKey(rfcNumber)

  const previous = reefStore.userDocuments[doc]
  if (isSubscribed === (previous?.isSubscribed ?? false)) {
    return
  }
  const subscriptionToRemove = previous?.yourSubscriptionId

  // Either way there is no id to hold: subscribing hasn't been given one yet, and unsubscribing is
  // giving one up. `subscriptionToRemove` is what remembers it for the DELETE and for the revert.
  reefStore.patchUserDocument(doc, { isSubscribed, yourSubscriptionId: undefined })

  const outcome = await reefStore.runWrite(`${doc}:subscription`, async (): Promise<number | undefined> => {
    if (isSubscribed) {
      // The id Reef assigns here is what unsubscribing needs, so it's kept rather than discarded.
      const { id } = await createSubscription({ kind: 'rfc', params: rfcSubscriptionParams(doc) })
      return id
    }
    // Unticking with nothing to remove can't happen — that's the equality check above — but the
    // type allows it, and then there's nothing to ask Reef for.
    if (subscriptionToRemove !== undefined) {
      await deleteSubscription(subscriptionToRemove)
    }
    return undefined
  })

  if (outcome.status === 'failed') {
    // Put the checkbox back to what Reef is actually holding, and say so. Without the toast the
    // box would simply spring back with nothing to explain it.
    reefStore.patchUserDocument(doc, {
      isSubscribed: previous?.isSubscribed ?? false,
      yourSubscriptionId: subscriptionToRemove
    })
    notificationsStore.add(subscriptionFailedNotification(rfcNumber, isSubscribed))
    console.error('Unable to change your subscription for this RFC.', outcome.error)
    return
  }

  reefStore.patchUserDocument(doc, { yourSubscriptionId: outcome.value })
}

// --- The model an RFC page binds ---------------------------------------------------------

/**
 * Whether this reader subscribes to one document, as a model for the subscribe dialog's checkbox:
 * read from the store, and written back when they tick or untick it. False while nobody is signed
 * in.
 */
export const useUserRFCSubscription = (rfcNumber: MaybeRefOrGetter<number>): WritableComputedRef<boolean> => {
  const { isSubscribed } = useReefDocument(rfcNumber)

  return computed({
    get: () => isSubscribed.value,
    set: (subscribed) => {
      void writeUserRFCSubscription(toValue(rfcNumber), subscribed)
    }
  })
}
