// How Red names a document to Reef, and how a component asks what Reef knows about one.
//
//   reefDocumentKey — the one canonical identifier, shared by the subscription, set and
//                     stats features.
//   useReefDocument — what one document is to this reader. Reads only; fires no request.
//
// There is nothing to declare: the reader's whole state is loaded when they sign in, so a card
// reads its answer out of ~/stores/reef whether it is one of fifty on a page or the only one.

import { computed, toValue, type ComputedRef, type MaybeRefOrGetter } from 'vue'
import { subscriptionKey, useReefStore } from '~/stores/reef'
import type { SeriesId } from '~/utilities/rfc'

/**
 * The identifier Reef canonicalizes to: the series followed by the number, lowercase, with no
 * separator — `rfc9110`, `bcp14`, `std66`.
 *
 * Takes a bare number as the RFC it reads as on an RFC page, or a SeriesId for anything that
 * isn't an RFC. Reef rejects a bare number itself — `14` is `bcp14` or `rfc14` and it won't
 * guess — so the series is always spelled out by the time a request is built.
 */
export const reefDocumentKey = (document: SeriesId | number): string =>
  typeof document === 'number' ? `rfc${document}` : `${document.type}${document.number}`

/**
 * What one document is to the reader looking at it.
 *
 * Nothing public: the subscriber and set totals arrive with the route's own
 * data and are passed down as props, so they are never asked for and never held here.
 */
export type ReefDocument = {
  /** Whether this reader subscribes to this document directly. */
  isSubscribed: ComputedRef<boolean>
  /** Which of this reader's sets hold it, as the checkbox group's value. */
  yourSetIds: ComputedRef<string[]>
}

/**
 * What Reef knows about one document, as reactive reads.
 *
 * Everything is undefined or empty until the reader's state has loaded, which is also what a
 * signed-out reader sees, so nothing rendering this needs a branch for whether anyone is signed in.
 * Whether it has loaded is ReefStore.status, which the controls that hide behind a loading message
 * read for themselves.
 */
export const useReefDocument = (document: MaybeRefOrGetter<SeriesId | number>): ReefDocument => {
  const reefStore = useReefStore()
  const key = computed(() => reefDocumentKey(toValue(document)))

  return {
    isSubscribed: computed(() => reefStore.isSubscribedTo(subscriptionKey({ kind: 'rfc', doc: key.value }))),
    yourSetIds: computed(() => reefStore.setIdsByDoc[key.value] ?? [])
  }
}
