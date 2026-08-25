// How Red names a document to Reef, and how a component asks what Reef knows about one.
//
// Two things live here, and they're the whole of what a component needs:
//
//   reefDocumentKey  — the one canonical identifier, replacing the four identical copies the
//                      rating, subscription, set and stats features each used to keep.
//   useReefDocument  — what one document is to this reader. Reads only; fires no request.
//   useReefDocuments — declares which documents are on screen, so they're loaded in one call.
//
// The split between the two composables is the point of the redesign. A card used to load its
// own Reef state, so a page of fifty cards made fifty requests per feature; now the page says
// what it's showing and every card reads the answer out of ~/stores/reef.

import { computed, toValue, watch, type ComputedRef, type MaybeRefOrGetter } from 'vue'
import { useReefStore, type ReefDocumentStatus, type ReefUserDocument } from '~/stores/reef'
import type { SeriesId } from '~/utilities/rfc'
import type { ReefRFCStats } from '~/utilities/rfc-validators'

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

/** What one document is to the reader looking at it. */
export type ReefDocument = {
  /** The public numbers: seeded from the route's own data, adjusted by this reader's writes. */
  stats: ComputedRef<ReefRFCStats | undefined>
  /** This reader's own rating, undefined while they haven't rated it. */
  yourRating: ComputedRef<number | undefined>
  /** Whether this reader subscribes to this document directly. */
  isSubscribed: ComputedRef<boolean>
  /** The id of that subscription, which is the only handle unsubscribing has. */
  yourSubscriptionId: ComputedRef<number | undefined>
  /** Which of this reader's sets hold it, as the checkbox group's value. */
  yourSetIds: ComputedRef<string[]>
  /** Whether the per-reader half has been loaded. `unknown` until something asks for it. */
  status: ComputedRef<ReefDocumentStatus>
}

/**
 * What Reef knows about one document, as reactive reads.
 *
 * Deliberately loads nothing. A card rendering this is one of many on a page, and the page is
 * what declares the batch — see useReefDocuments. A component that is genuinely alone with its
 * document calls both.
 *
 * Everything is undefined or empty until then, which is also what a signed-out reader sees, so
 * nothing rendering this needs a branch for whether anyone is signed in.
 */
export const useReefDocument = (document: MaybeRefOrGetter<SeriesId | number>): ReefDocument => {
  const reefStore = useReefStore()
  const key = computed(() => reefDocumentKey(toValue(document)))
  const userDocument = computed<ReefUserDocument | undefined>(() => reefStore.userDocuments[key.value])

  return {
    stats: computed(() => reefStore.stats[key.value]),
    yourRating: computed(() => userDocument.value?.yourRating),
    isSubscribed: computed(() => userDocument.value?.yourSubscriptionId !== undefined),
    yourSubscriptionId: computed(() => userDocument.value?.yourSubscriptionId),
    yourSetIds: computed(() => userDocument.value?.yourSetIds ?? []),
    status: computed(() => userDocument.value?.status ?? 'unknown')
  }
}

/** An RFC as the routes that list them supply it: its number, and the numbers if they came with it. */
export type ReefRfc = {
  number: number
  reefStats?: ReefRFCStats
}

/**
 * Declare a list of RFCs: remember the public numbers they arrived with, and load this reader's own
 * state for all of them in one call.
 *
 * What every route listing RFCs uses — a page of search results, the homepage's latest, a subseries
 * page — because they all carry RfcCommon, and RfcCommon is where the numbers ride along. The
 * seeding runs during the server render as well, so the numbers are on the page before any of this
 * reaches a browser.
 */
export const useReefRfcs = (rfcs: MaybeRefOrGetter<ReefRfc[]>): void => {
  const reefStore = useReefStore()

  watch(
    () => toValue(rfcs),
    (list) => {
      list.forEach(({ number, reefStats }) => {
        reefStore.seedStats(reefDocumentKey(number), reefStats)
      })
    },
    { immediate: true, deep: true }
  )

  useReefDocuments(() => toValue(rfcs).map(({ number }) => number))
}

/**
 * Declare which documents are on screen, so this reader's state for all of them is loaded in one
 * call — and so a document already loaded isn't asked for again.
 *
 * Called once per list, by whatever owns the list: a page of search results, the homepage's
 * latest, the RFC page with its single document. Whether anyone is signed in isn't a parameter
 * because the store decides that, and it re-runs by itself when the answer changes.
 */
export const useReefDocuments = (documents: MaybeRefOrGetter<(SeriesId | number)[]>): void => {
  const reefStore = useReefStore()

  watch(
    // The keys rather than the documents, so a list that rerenders with equal-but-new objects —
    // which a search result list does on every keystroke — doesn't reload what it already has.
    () => toValue(documents).map(reefDocumentKey),
    (keys) => {
      void reefStore.ensureDocuments(keys)
    },
    // Immediate because both gates in front of this are async and client-side: a restored session
    // often lands before setup runs, leaving no transition to observe.
    { immediate: true, deep: true }
  )

  // A reader signing in mid-page has to load what's already on screen, and one signing out has
  // nothing to load but must not keep the previous reader's answers on the page — the store's
  // reset handles the second, and this handles the first.
  watch(
    () => reefStore.isReadable,
    () => {
      void reefStore.ensureDocuments(toValue(documents).map(reefDocumentKey))
    }
  )
}
