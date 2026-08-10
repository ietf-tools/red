// Rating feature logic: the star scale itself, and reading and writing the signed-in user's own
// rating of an RFC through the Reef API.
//
// Lives here rather than in RFCDocumentReefStats/RFCDocumentRateThisRFC so the display and the
// rating dialog share one definition of what a rating is, and one way of fetching and saving one.

import { getRating, putRating, type RatingAggregate } from '~/utilities/reef'

export const STAR_SCORE_LENGTH = 5

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
  rating === undefined ? 'Not rated yet' : `${rating} out of ${STAR_SCORE_LENGTH} stars`

// Reef reports the caller's own rating as `your_rating`, null when they haven't rated the RFC.
// The spec also notes that a credential is what *adds* the field, so an anonymous response omits
// it rather than sending null; `??` collapses both of those to undefined, which is the one
// "no rating" value the rest of this module deals in.
const userRFCRatingFromAggregate = ({ your_rating }: RatingAggregate): UserRFCRating => your_rating ?? undefined

// The caller's own rating of one RFC. Browser-only, like the rest of the Reef client, and it
// only says anything for a signed-in caller — the bearer token is how Reef knows whose rating
// to report, so an anonymous call can only ever come back with the aggregate.
export const getUserRFCRating = async (rfcNumber: number, signal?: AbortSignal): Promise<UserRFCRating> =>
  userRFCRatingFromAggregate(await getRating(ratingKey(rfcNumber), signal))

// Persist the caller's own rating. PUT is Reef's upsert for "my rating of this RFC", so this
// covers both a first rating and a change of mind, and it needs a token — an anonymous caller has
// no rating to write. Reef enforces the 1..STAR_SCORE_LENGTH bounds itself and answers a value
// outside them with a 400. The updated aggregate comes back; callers showing precomputed numbers
// can ignore it.
export const saveUserRFCRating = (rfcNumber: number, rating: number, signal?: AbortSignal): Promise<RatingAggregate> =>
  putRating(ratingKey(rfcNumber), { value: rating }, signal)
