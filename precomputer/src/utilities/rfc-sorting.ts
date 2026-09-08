import { DateTime } from 'luxon'
import { type RfcCommon } from '../../../website/app/utilities/rfc-validators.ts'

/**
 * Newest first by publish date, then RFC number descending so ties are deterministic.
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
    !a.published ||
    !b.published
  ) {
    throw Error('internal error. bad sorting')
  }

  // `publish` looks like '2026-01-30' there's no hours/seconds.
  // So often publish dates will be the same.
  const aPublished = DateTime.fromISO(a.published)
  const bPublished = DateTime.fromISO(b.published)

  const difference = bPublished.toMillis() - aPublished.toMillis()

  // If the publishing dates are different prefer that for sorting.
  if (difference !== 0) {
    return difference
  }

  // Publish dates carry no time, so ties are common. Returning 0 would leave tied RFCs in
  // input order and the homepage and feeds need a deterministic order; RFC numbers are unique
  // and stable, so they break the tie.
  return b.number - a.number
}
