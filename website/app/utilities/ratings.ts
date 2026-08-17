// Rating feature logic: the star scale itself, and reading and writing the signed-in user's own
// rating of an RFC through the Reef API.
//
// Lives here rather than in RFCDocumentReefStats/RFCDocumentRateThisRFC so the display and the
// rating dialog share one definition of what a rating is, and one way of fetching and saving one.

import { useAuthStore } from '~/stores/auth'
import type { Notification } from '~/stores/notifications'
import { deleteRating, getRating, putRating, type RatingAggregate } from '~/utilities/reef'

export const STAR_SCORE_LENGTH = 5

export const COVER_LINK_STYLE_CLASS = `${
  // the card background colour layer
  "before:absolute before:content-[''] before:inset-0 before:rounded"
} ${
  // card background layer should be below the slots z-index
  'before:z-0'
} ${
  // the card cover link itself (increases clickable area of the link)
  "after:absolute after:content-[''] after:inset-0"
} ${
  // card cover link should be above the card background colour layer, so 40 is
  // an arbitrary choice.
  //
  // Generally slots content should be between these layers, so that means
  // z-index 1-39.
  //
  // however sometimes slot content intentionally rises above (eg RFCCard usage
  // of Card has Subseries links see RFC2119) and 'Show Abstract' buttons which
  // should be stacked above 40.
  'after:z-40'
} after:transition-all ${
  // card tint when focus/hover
  `hover:text-blue-400 focus:text-blue-400 dark:hover:text-blue-100 dark:focus:text-blue-100 hover:before:bg-sky-100 focus:before:bg-blue-25 dark:hover:before:bg-blue-900 dark:focus:before:bg-blue-900`
} ${
  // Link border
  `after:border-1 after:border-white dark:after:border-black after:rounded hover:after:border-blue-800 focus:after:outline-2 focus:after:outline-black`
}`

export const COVER_LINK_INNER_STYLE_CLASS = `relative z-1`

// A rating is a whole number of stars, 1..STAR_SCORE_LENGTH — see RatingWrite.value's minimum
// and maximum in reef_api.yaml. `undefined` means the user hasn't rated this RFC, which is a
// different thing from a zero rating: Reef has no such value. It also matches StarRating's
// defineModel<number>(), so a UserRFCRating can be bound straight to the component.
export type UserRFCRating = number | undefined

// Reef canonicalizes document identifiers ("RFC 9110" and "rfc9110" are the same entry, per the
// sets_documents_update description), so the compact form is what we send.
export const ratingKey = (rfcNumber: number): string => `rfc${rfcNumber}`

// Wording for the reader's own rating, used both as the dialog's live summary and as the trigger
// label. Spelled out rather than left to the stars alone, so it's available to a screen reader and
// so "not rated yet" is stated rather than implied by five empty outlines.
export const userRFCRatingLabel = (rating: UserRFCRating): string =>
  rating === undefined ? '' : `${rating} out of ${STAR_SCORE_LENGTH} stars`

// --- Cache ------------------------------------------------------------------------------
//
// The reader's own rating, remembered for the lifetime of the tab so that moving between RFCs and
// coming back doesn't re-ask Reef for a number this tab already knows.
//
// sessionStorage rather than localStorage because the tab is the honest lifetime: within one tab
// the only thing that can change this rating is saveUserRFCRating below, and it writes through, so
// a hit needs no expiry to be trusted. A rating the same reader changes in another tab or on
// another device is not picked up until this tab reloads — that bounded staleness is what the
// per-tab lifetime buys, and it's why this isn't localStorage.

const RATING_CACHE_PREFIX = 'red.reef.user-rating.'

// Keyed by the OIDC subject as well as the RFC, because sessionStorage outlives a sign-out: two
// readers using the same tab in turn must not be shown each other's ratings. Signed out there's
// nothing to key by and nothing worth caching either, since an anonymous response carries no
// rating of its own — so the caller falls through to Reef.
const ratingCacheKey = (rfcNumber: number): string | undefined => {
  const { user } = useAuthStore()
  return user === undefined ? undefined : `${RATING_CACHE_PREFIX}${user.sub}.${ratingKey(rfcNumber)}`
}

// A hit is the wrapper being present, not the rating being set: `undefined` is a real cached
// answer ("this reader hasn't rated this RFC") and worth a hit of its own, or every visit by a
// non-rater would ask Reef again.
type CachedUserRFCRating = { rating: UserRFCRating }

const isCachedRatingValue = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= STAR_SCORE_LENGTH

const readCachedUserRFCRating = (rfcNumber: number): CachedUserRFCRating | undefined => {
  if (!import.meta.client) {
    return undefined
  }
  try {
    const key = ratingCacheKey(rfcNumber)
    if (key === undefined) {
      return undefined
    }
    const stored = window.sessionStorage.getItem(key)
    if (stored === null) {
      return undefined
    }
    const parsed: unknown = JSON.parse(stored)
    // JSON has no undefined, so "not rated" is stored as null and read back as a hit.
    if (parsed === null) {
      return { rating: undefined }
    }
    if (isCachedRatingValue(parsed)) {
      return { rating: parsed }
    }
    // Written by an older version of this code, or edited by hand. Discard it and ask Reef, which
    // is the only thing that can restore a value we're able to trust.
    window.sessionStorage.removeItem(key)
    return undefined
  } catch (error) {
    // sessionStorage throws outright when browser storage is disabled, and JSON.parse throws on a
    // truncated value. Either way the cache is unavailable, which is a miss rather than a failure.
    console.warn('[ratings] unable to read the cached rating; asking Reef instead', error)
    return undefined
  }
}

const writeCachedUserRFCRating = (rfcNumber: number, rating: UserRFCRating): void => {
  if (!import.meta.client) {
    return
  }
  try {
    const key = ratingCacheKey(rfcNumber)
    if (key === undefined) {
      return
    }
    window.sessionStorage.setItem(key, JSON.stringify(rating ?? null))
  } catch (error) {
    // Storage disabled, or the quota is full. Nothing to do about it: the next read is a miss and
    // Reef answers as it did before this cache existed. Never rethrown: this runs after Reef has
    // already accepted the rating, so a failure to remember it locally is not a failed save.
    console.warn('[ratings] unable to cache the rating', error)
  }
}

// --- Reads and writes -------------------------------------------------------------------

// The caller's own rating of one RFC, from the tab's cache when it has been read or written
// already. Browser-only, like the rest of the Reef client, and it only says anything for a
// signed-in caller — the bearer token is how Reef knows whose rating to report, so an anonymous
// call can only ever come back with the aggregate.
export const getUserRFCRating = async (rfcNumber: number, signal?: AbortSignal): Promise<UserRFCRating> => {
  const cached = readCachedUserRFCRating(rfcNumber)
  if (cached !== undefined) {
    return cached.rating
  }

  const { your_rating } = await getRating(ratingKey(rfcNumber), signal)
  // Reef reports the caller's own rating as `your_rating`, null when they haven't rated the RFC.
  // The spec also notes that a credential is what *adds* the field, so an anonymous response omits
  // it rather than sending null; `??` collapses both of those to undefined, which is the one
  // "no rating" value the rest of this module deals in.
  const rating = your_rating ?? undefined
  writeCachedUserRFCRating(rfcNumber, rating)
  return rating
}

// Persist the caller's own rating. PUT is Reef's upsert for "my rating of this RFC", so this
// covers both a first rating and a change of mind, and it needs a token — an anonymous caller has
// no rating to write. Reef enforces the 1..STAR_SCORE_LENGTH bounds itself and answers a value
// outside them with a 400. The updated aggregate comes back; callers showing precomputed numbers
// can ignore it.
export const saveUserRFCRating = async (
  rfcNumber: number,
  rating: number,
  signal?: AbortSignal
): Promise<RatingAggregate> => {
  const aggregate = await putRating(ratingKey(rfcNumber), { value: rating }, signal)
  // Only once Reef has accepted it. A PUT that 400s, or one aborted because the reader picked
  // again, rejects before this line, so the tab never caches a rating Reef isn't holding.
  writeCachedUserRFCRating(rfcNumber, rating)
  return aggregate
}

// Withdraw the caller's own rating, so the RFC goes back to being one they haven't rated and their
// score stops counting towards the public average. Reef's DELETE is idempotent, so this is safe to
// call for a reader who has nothing to remove. Like saveUserRFCRating it returns the recomputed
// aggregate, which callers showing precomputed numbers can ignore.
export const removeUserRFCRating = async (rfcNumber: number, signal?: AbortSignal): Promise<RatingAggregate> => {
  const aggregate = await deleteRating(ratingKey(rfcNumber), signal)
  // Cached as an `undefined` rating rather than dropped from the cache: "this reader hasn't rated
  // this RFC" is a real answer and worth a hit of its own, and dropping it would send the next
  // visit back to Reef for a value this tab just decided.
  writeCachedUserRFCRating(rfcNumber, undefined)
  return aggregate
}

// --- Announcements ----------------------------------------------------------------------
//
// Picking a star is announced by the live region inside the dialog, but a removal can't be:
// removing closes the dialog, which takes that live region out of the DOM before a reader hears
// anything from it. A toast outlives the dialog, so it's what reports the outcome — and `foreground`
// is what has a screen reader announce it, this being a direct result of pressing the button.

// One id per RFC, shared by both outcomes, so a retry replaces the previous message in place
// rather than stacking a second toast on top of it.
const ratingRemovalNotificationId = (rfcNumber: number): string => `rating-removal.${ratingKey(rfcNumber)}`

export const ratingRemovedNotification = (rfcNumber: number): Notification => ({
  id: ratingRemovalNotificationId(rfcNumber),
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
  id: ratingRemovalNotificationId(rfcNumber),
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
