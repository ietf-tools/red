// Feature logic for a user's notification subscriptions — the model an RFC page binds its
// subscribe dialog to. The account page's own list and delete presentation lives in
// ~/components/AccountSubscriptions.vue, since nothing else needs it.
//
// Whether this reader subscribes to a document is read from ~/stores/reef, which receives every
// per-reader answer per document in one response.

import {
  computed,
  onMounted,
  ref,
  toValue,
  watch,
  type ComputedRef,
  type MaybeRefOrGetter,
  type Ref,
  type WritableComputedRef
} from 'vue'
import { useAuthStore } from '~/stores/auth'
import { useNotificationsStore, type Notification } from '~/stores/notifications'
import { useReefStore, type ReefDocumentStatus } from '~/stores/reef'
import { createSubscription, deleteSubscription, getSubscriptions } from '~/utilities/reef'
import { reefDocumentKey, useReefDocument } from '~/utilities/reef-documents'
import type { LoadingStatus } from '~/utilities/loading-status'
import type { SeriesId } from '~/utilities/rfc'

// --- Subscribing to one document ----------------------------------------------------------
//
// The `rfc` kind — "Changes to one specific RFC" — is the only kind a document page deals in, and
// the only one Red creates. Reef takes any canonical document id under it, so a BCP, STD or FYI
// subseries is subscribed to the same way as an RFC. Everything below is about that one kind.

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

const documentLabel = (document: SeriesId | number): string =>
  typeof document === 'number' ? `RFC ${document}` : `${document.type.toUpperCase()} ${document.number}`

export const subscriptionFailedNotification = (document: SeriesId | number, wasSubscribing: boolean): Notification => ({
  // One id per document whichever way the toggle was going, so a retry replaces the previous
  // message rather than stacking a second toast on top of it.
  id: `rfc-subscription.${reefDocumentKey(document)}`,
  title: wasSubscribing ? 'Unable to subscribe' : 'Unable to unsubscribe',
  description: wasSubscribing
    ? `You have not been subscribed to ${documentLabel(document)}. Please try again.`
    : `You are still subscribed to ${documentLabel(document)}. Please try again.`,
  delayMs: 0,
  position: 'top',
  // A direct result of the reader pressing the checkbox, so it's announced rather than left to be
  // noticed.
  type: 'foreground'
})

/**
 * Subscribe this reader to one document, or unsubscribe them.
 *
 * The checkbox moves first and is put back if Reef refuses. Subscribing has no id until Reef
 * assigns one, which is why the store holds `isSubscribed` apart from `yourSubscriptionId`:
 * between the tick and the response the reader is subscribed as far as the page is concerned, and
 * unsubscribing is what needs the id.
 */
export const writeUserRFCSubscription = async (document: SeriesId | number, isSubscribed: boolean): Promise<void> => {
  const reefStore = useReefStore()
  const notificationsStore = useNotificationsStore()
  const doc = reefDocumentKey(document)

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
    notificationsStore.add(subscriptionFailedNotification(document, isSubscribed))
    console.error('Unable to change your subscription for this document.', outcome.error)
    return
  }

  reefStore.patchUserDocument(doc, { yourSubscriptionId: outcome.value })
}

/**
 * Whether this reader subscribes to one document, as a model for the subscribe dialog's checkbox:
 * read from the store, and written back when they tick or untick it. False while nobody is signed
 * in.
 *
 * `status` is exposed alongside so the dialog can hold off showing the checkbox until the
 * per-reader half has arrived — an unticked box while it's still loading would read as "not
 * subscribed" rather than "not known yet".
 */
export const useUserRFCSubscription = (
  document: MaybeRefOrGetter<SeriesId | number>
): { isSubscribed: WritableComputedRef<boolean>; status: ComputedRef<ReefDocumentStatus> } => {
  const { isSubscribed, status } = useReefDocument(document)

  return {
    isSubscribed: computed({
      get: () => isSubscribed.value,
      set: (subscribed) => {
        void writeUserRFCSubscription(toValue(document), subscribed)
      }
    }),
    status
  }
}

// --- Subscribing to all new RFCs ------------------------------------------------------------
//
// The `new_rfc` kind — "Any new RFC" — is one subscription for the whole account rather than one
// per document, so unlike the `rfc` kind above there's no document to key it by and no reef store
// entry already holding it. It's found the same way the account page's full list is: asking Reef
// for every subscription this reader has and picking the `new_rfc` one out.

export const newRfcSubscriptionFailedNotification = (wasSubscribing: boolean): Notification => ({
  id: 'new-rfc-subscription',
  title: wasSubscribing ? 'Unable to subscribe' : 'Unable to unsubscribe',
  description: wasSubscribing
    ? 'You have not been subscribed to new RFCs. Please try again.'
    : 'You are still subscribed to new RFCs. Please try again.',
  delayMs: 0,
  position: 'top',
  type: 'foreground'
})

/**
 * Whether this reader subscribes to all new RFCs, as a model for the "subscribe to all" dialog's
 * checkbox: loaded from Reef on mount, and written back when they tick or untick it. False while
 * nobody is signed in, and while the load is still in flight.
 *
 * `status` is exposed alongside the checkbox model so a caller can hold off showing it until the
 * load settles — while it's in flight there's no true state to show yet, and an unticked box
 * would read as "off" rather than "not known yet".
 */
export const useUserNewRfcSubscription = (): {
  isSubscribed: WritableComputedRef<boolean>
  status: Ref<LoadingStatus>
} => {
  const authStore = useAuthStore()
  const reefStore = useReefStore()
  const notificationsStore = useNotificationsStore()

  const isSubscribed = ref(false)
  const subscriptionId = ref<number>()
  const status = ref<LoadingStatus>({ type: 'idle' })

  const load = async () => {
    if (!authStore.isAuthenticated) {
      isSubscribed.value = false
      subscriptionId.value = undefined
      status.value = { type: 'idle' }
      return
    }
    status.value = { type: 'loading' }
    try {
      const subscriptions = await getSubscriptions()
      const existing = subscriptions.find((subscription) => subscription.kind === 'new_rfc')
      isSubscribed.value = existing !== undefined
      subscriptionId.value = existing?.id
      status.value = { type: 'success' }
    } catch (error) {
      console.error('Unable to load your new-RFC subscription.', error)
      status.value = {
        type: 'error',
        message: 'Unable to load your new-RFC subscription. See the web console for details.'
      }
    }
  }

  // Reef is browser-only, so the initial load happens on mount rather than during SSR; the watch
  // (not immediate — that's what onMounted is for) covers a reader who signs in or out while this
  // stays on screen.
  onMounted(load)
  watch(() => authStore.isAuthenticated, load)

  const write = async (subscribed: boolean) => {
    if (subscribed === isSubscribed.value) {
      return
    }
    const previous = isSubscribed.value
    const previousId = subscriptionId.value

    isSubscribed.value = subscribed

    const outcome = await reefStore.runWrite('new_rfc-subscription', async (): Promise<number | undefined> => {
      if (subscribed) {
        const { id } = await createSubscription({ kind: 'new_rfc' })
        return id
      }
      if (previousId !== undefined) {
        await deleteSubscription(previousId)
      }
      return undefined
    })

    if (outcome.status === 'failed') {
      isSubscribed.value = previous
      subscriptionId.value = previousId
      notificationsStore.add(newRfcSubscriptionFailedNotification(subscribed))
      console.error('Unable to change your new-RFC subscription.', outcome.error)
      return
    }

    subscriptionId.value = outcome.value
  }

  return {
    isSubscribed: computed({
      get: () => isSubscribed.value,
      set: (subscribed) => {
        void write(subscribed)
      }
    }),
    status
  }
}

// --- Subscribing to one subject ------------------------------------------------------------
//
// The `subject` kind — "Changes to anything carrying a subject" — names its subject by a foreign
// key on the subscription itself (`subject`), not under `params` the way the `rfc` kind names its
// document. Otherwise this is the same shape as `new_rfc` above: one subscription for the whole
// account rather than one per document, found by asking Reef for every subscription this reader
// has and picking the matching one out.

export const subjectSubscriptionFailedNotification = (
  subjectId: number,
  subjectName: string,
  wasSubscribing: boolean
): Notification => ({
  // One id per subject whichever way the toggle was going, so a retry replaces the previous
  // message rather than stacking a second toast on top of it.
  id: `subject-subscription.${subjectId}`,
  title: wasSubscribing ? 'Unable to subscribe' : 'Unable to unsubscribe',
  description: wasSubscribing
    ? `You have not been subscribed to ${subjectName}. Please try again.`
    : `You are still subscribed to ${subjectName}. Please try again.`,
  delayMs: 0,
  position: 'top',
  type: 'foreground'
})

/**
 * Whether this reader subscribes to one subject, as a model for the subject page's subscribe
 * dialog: loaded from Reef on mount, and written back when they tick or untick it. False while
 * nobody is signed in, and while the load is still in flight.
 *
 * `status` is exposed alongside the checkbox model so a caller can hold off showing it until the
 * load settles — while it's in flight there's no true state to show yet, and an unticked box
 * would read as "off" rather than "not known yet".
 */
export const useUserSubjectSubscription = (
  subjectId: MaybeRefOrGetter<number>,
  subjectName: MaybeRefOrGetter<string>
): { isSubscribed: WritableComputedRef<boolean>; status: Ref<LoadingStatus> } => {
  const authStore = useAuthStore()
  const reefStore = useReefStore()
  const notificationsStore = useNotificationsStore()

  const isSubscribed = ref(false)
  const subscriptionId = ref<number>()
  const status = ref<LoadingStatus>({ type: 'idle' })

  const load = async () => {
    if (!authStore.isAuthenticated) {
      isSubscribed.value = false
      subscriptionId.value = undefined
      status.value = { type: 'idle' }
      return
    }
    status.value = { type: 'loading' }
    try {
      const subscriptions = await getSubscriptions()
      const existing = subscriptions.find(
        (subscription) => subscription.kind === 'subject' && subscription.subject === toValue(subjectId)
      )
      isSubscribed.value = existing !== undefined
      subscriptionId.value = existing?.id
      status.value = { type: 'success' }
    } catch (error) {
      console.error('Unable to load your subject subscription.', error)
      status.value = {
        type: 'error',
        message: 'Unable to load your subject subscription. See the web console for details.'
      }
    }
  }

  // Reef is browser-only, so the initial load happens on mount rather than during SSR; the watch
  // (not immediate — that's what onMounted is for) covers a reader who signs in or out while this
  // stays on screen.
  onMounted(load)
  watch(() => authStore.isAuthenticated, load)

  const write = async (subscribed: boolean) => {
    if (subscribed === isSubscribed.value) {
      return
    }
    const previous = isSubscribed.value
    const previousId = subscriptionId.value
    const id = toValue(subjectId)

    isSubscribed.value = subscribed

    const outcome = await reefStore.runWrite(`subject-${id}-subscription`, async (): Promise<number | undefined> => {
      if (subscribed) {
        const { id: newId } = await createSubscription({ kind: 'subject', subject: id })
        return newId
      }
      if (previousId !== undefined) {
        await deleteSubscription(previousId)
      }
      return undefined
    })

    if (outcome.status === 'failed') {
      isSubscribed.value = previous
      subscriptionId.value = previousId
      notificationsStore.add(subjectSubscriptionFailedNotification(id, toValue(subjectName), subscribed))
      console.error('Unable to change your subject subscription.', outcome.error)
      return
    }

    subscriptionId.value = outcome.value
  }

  return {
    isSubscribed: computed({
      get: () => isSubscribed.value,
      set: (subscribed) => {
        void write(subscribed)
      }
    }),
    status
  }
}
