// Rating feature logic: the star scale itself, writing the signed-in reader's own rating of a
// document back to Reef, and the model an RFC page binds its rating dialog to.
//
// Reading a rating happens in ~/stores/reef, along with every other per-reader answer, because
// they all arrive in one response. What's left here is what's particular to a rating: what a
// rating is, how it's worded, what happens when Reef refuses one, and how the public average
// moves when this reader changes theirs.

import { computed, toValue, type MaybeRefOrGetter, type WritableComputedRef } from 'vue'
import { useNotificationsStore, type Notification } from '~/stores/notifications'
import { useReefStore } from '~/stores/reef'
import { deleteRating, putRating, type RatingAggregate } from '~/utilities/reef'
import { reefDocumentKey, useReefDocument } from '~/utilities/reef-documents'

export const STAR_SCORE_LENGTH = 5

// A rating is a whole number of stars, 1..STAR_SCORE_LENGTH — see RatingWrite.value's minimum
// and maximum in reef_api.yaml. `undefined` means the user hasn't rated this RFC, which is a
// different thing from a zero rating: Reef has no such value. It also matches StarRating's
// defineModel<number>(), so a UserRFCRating can be bound straight to the component.
export type UserRFCRating = number | undefined

// Wording for the reader's own rating, used both as the dialog's live summary and as the trigger
// label. Spelled out rather than left to the stars alone, so it's available to a screen reader and
// so "not rated yet" is stated rather than implied by five empty outlines.
export const userRFCRatingLabel = (rating: UserRFCRating): string =>
  rating === undefined ? '' : `${rating} out of ${STAR_SCORE_LENGTH} stars`

// --- Announcements ----------------------------------------------------------------------
//
// Picking a star is announced by the live region inside the dialog, but a removal can't be:
// removing closes the dialog, which takes that live region out of the DOM before a reader hears
// anything from it. A toast outlives the dialog, so it's what reports the outcome — and `foreground`
// is what has a screen reader announce it, this being a direct result of pressing the button.

// One id per document, shared by both outcomes, so a retry replaces the previous message in place
// rather than stacking a second toast on top of it.
const ratingRemovalNotificationId = (doc: string): string => `rating-removal.${doc}`

export const ratingRemovedNotification = (rfcNumber: number): Notification => ({
  id: ratingRemovalNotificationId(reefDocumentKey(rfcNumber)),
  title: 'Rating removed',
  description: `Your rating of RFC ${rfcNumber} has been removed, and no longer counts towards the average.`,
  delayMs: 0,
  // Short: a confirmation of something the reader just did, with nothing in it to act on, and the
  // button behind it has already gone back to offering a rating. Nothing is lost by missing it.
  durationMs: 5_000,
  position: 'top',
  type: 'foreground'
})

export const ratingRemovalFailedNotification = (rfcNumber: number): Notification => ({
  id: ratingRemovalNotificationId(reefDocumentKey(rfcNumber)),
  title: 'Unable to remove your rating',
  // Says what the reader is left with, because the stars have been put back and the wording has to
  // account for them reappearing.
  description: `Your rating of RFC ${rfcNumber} is unchanged. Please try again.`,
  delayMs: 0,
  // Left to the default duration rather than the confirmation's five seconds: this one asks the
  // reader to do something about it, so it wants longer on screen than a confirmation does.
  position: 'top',
  type: 'foreground'
})

// --- Writing ------------------------------------------------------------------------------

// Reef answers both the PUT and the DELETE with the recomputed public aggregate, so this reader's
// own rating moves the average they're looking at without anything re-reading the route's data.
// Nothing else about the document's numbers is touched.
const applyRatingAggregate = (doc: string, { average, count }: RatingAggregate): void => {
  useReefStore().adjustStats(doc, (current) => ({
    ...current,
    ratingAggregate: { average: average ?? undefined, count }
  }))
}

/**
 * Record or withdraw this reader's rating of one document.
 *
 * The store is changed first and put back if Reef refuses, so the stars move when the reader
 * presses them rather than a round trip later.
 */
export const writeUserRFCRating = async (rfcNumber: number, rating: UserRFCRating): Promise<void> => {
  const reefStore = useReefStore()
  const notificationsStore = useNotificationsStore()
  const doc = reefDocumentKey(rfcNumber)

  const previous = reefStore.userDocuments[doc]?.yourRating
  if (rating === previous) {
    return
  }

  // undefined is the reader withdrawing their rating rather than any value to store, so it's the
  // one case that deletes instead of putting.
  const isRemoval = rating === undefined

  reefStore.patchUserDocument(doc, { yourRating: rating })

  const outcome = await reefStore.runWrite(`${doc}:rating`, () =>
    isRemoval ? deleteRating(doc) : putRating(doc, { value: rating })
  )

  if (outcome.status === 'failed') {
    // Put the rating back to what Reef is holding. For a removal the dialog has already closed and
    // the stars have emptied, so without the toast the only visible result would be them silently
    // reappearing.
    reefStore.patchUserDocument(doc, { yourRating: previous })
    if (isRemoval) {
      notificationsStore.add(ratingRemovalFailedNotification(rfcNumber))
      console.error('Unable to remove your rating for this RFC.', outcome.error)
      return
    }
    // Leaves the stars back where they were. Worth surfacing to the reader eventually; for now
    // it's a console error rather than a silent divergence.
    console.error('Unable to save your rating for this RFC.', outcome.error)
    return
  }

  applyRatingAggregate(doc, outcome.value)

  if (isRemoval) {
    // Announced only once Reef has accepted it, and only for a removal: picking a star is
    // announced by the live region in the dialog, but the dialog closes on a removal, so this
    // toast is the only report the reader gets.
    notificationsStore.add(ratingRemovedNotification(rfcNumber))
  }
}

// --- The model an RFC page binds ---------------------------------------------------------

/**
 * This reader's own rating of one document, as a model for the rating dialog: read from the store,
 * and written back when they pick a star or remove it. `undefined` while they haven't rated it,
 * and while nobody is signed in.
 *
 * A writable computed rather than a ref with a watcher on it, which is what the store replaced.
 * The store already holds what Reef is holding, so there is nothing to compare against to tell a
 * load from a deliberate change — a load is not a change to this model at all.
 */
export const useUserRFCRating = (rfcNumber: MaybeRefOrGetter<number>): WritableComputedRef<UserRFCRating> => {
  const { yourRating } = useReefDocument(rfcNumber)

  return computed({
    get: () => yourRating.value,
    set: (rating) => {
      void writeUserRFCRating(toValue(rfcNumber), rating)
    }
  })
}
