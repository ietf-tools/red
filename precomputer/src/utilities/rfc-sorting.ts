import { DateTime } from "luxon"
import { type RfcCommon } from "../../../website/app/utilities/rfc-validators.ts"

/**
 * Sorts RfcCommon's by publish date
 * if publish dates are identical it sorts by RFC number for reasons disclosed
 * in docstrings below
 */
export const sortByRfcPublish = (a: RfcCommon, b: RfcCommon): number => {
  if (!a.published && !b.published) {
    return 0
  }
  if (a.published && !b.published) {
    return -1
  }
  if (!a.published && b.published) {
    return 1
  }

  if (
    // this shouldn't be possible with the previous checks
    // so this check is only to help TS narrow types
    !a.published || !b.published) {
    throw Error('internal error. bad sorting')
  }


  // `publish` looks like '2026-01-30' there's no hours/seconds.
  // So often publish dates will be the same.
  const aPublished = DateTime.fromISO(a.published)
  const bPublished = DateTime.fromISO(b.published)

  const difference = bPublished.toMillis() - aPublished.toMillis()

  if (
    // If the publishing dates are different prefer that for sorting.
    difference !== 0
  ) {
    return difference
  }

  // the publish dates are identical, so we'll sort by rfc number,
  // largest wins.
  //
  // We do need a way of sorting RFCs with identical publish dates.
  // Returning 0 isn't an appropriate response imo as the JS sort
  // would interpret 0 as "sort order doesn't matter for a and b"
  // which makes it retain the input order. So randomising the
  // input order would randomise the output order of some RFCs.
  //
  // In practice we've already sorted in the input array but we
  // shouldn't depend on that. We use `sortByRfcPublish` for
  // RFCs on the homepage and RSS/Atom feeds etc., so we want
  // stable ordering.
  //
  // Current solution: We know that RFC numbers are stable and they
  // don't overlap, making them perfect for sorting as a fallback.
  // Using this for sorting makes this sort function deterministic.
  return b.number - a.number
}