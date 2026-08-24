// The public engagement numbers for one RFC: how it's been rated, how many readers subscribe to it,
// and how many document sets hold it.
//
// Its own module rather than part of ~/utilities/reef-ratings, ~/utilities/reef-subscriptions and
// ~/utilities/reef-sets, even though it carries a number belonging to each, because these are
// unlike anything those three deal in. They're the same for every visitor, no credential changes
// them, and they're wanted in the server render — so they're loaded with useAsyncData, whose answer
// travels to the browser in the page payload, rather than through the client-only request
// coordination the per-reader features share.
//
// Reef reports all three together as one /api/reef/stats/ row. What that row is mapped onto is
// ReefRFCStats, the same shape the bucket JSON can carry precomputed, so the components rendering
// the numbers never learn which of the two they were given.

import { computed, type Ref } from 'vue'
import { z } from 'zod'
import { getDocumentStats } from '~/utilities/reef'
import type { ReefRFCStats } from '~/utilities/rfc-validators'

// Reef canonicalizes document identifiers ("RFC 9110" and "rfc9110" address the same entry), so the
// compact form is what we send — and what names the useAsyncData entry, so the key reads as the
// document it holds the numbers for.
export const statsDocumentKey = (rfcNumber: number): string => `rfc${rfcNumber}`

// How long the render will wait for Reef before giving up on the numbers. Bounded because this call
// is made during SSR, where an unbounded wait on a third-party service would be an unbounded wait
// for the RFC itself. The numbers are decoration; the document is not.
const STATS_TIMEOUT_MS = 1500

// One row as reef_api.yaml describes it. Validated rather than trusted to match the generated
// types, unlike the rest of the Reef client, because this is the one Reef response the server render
// depends on: a Reef answering with something unexpected has to come out as no numbers, not as an
// exception thrown mid-SSR.
const DocumentStatsSchema = z.object({
  doc: z.string(),
  rating_average: z.number().nullable(),
  rating_count: z.number(),
  subscriber_count: z.number(),
  set_count: z.number()
})

// Reef sends null for the average of an RFC nobody has rated, which is the same thing to a reader as
// having no average to show, so the two are folded together here rather than in a template.
export const documentStatsToReefStats = (stats: z.infer<typeof DocumentStatsSchema>): ReefRFCStats => {
  const { rating_average, rating_count, subscriber_count, set_count } = stats
  return {
    ratingAggregate: {
      average: rating_average ?? undefined,
      count: rating_count
    },
    subscriberCount: subscriber_count,
    setCount: set_count
  }
}

// The numbers for the one document that was asked for, or undefined if the response holds nothing
// usable. The first row rather than the row whose `doc` matches: the request named a single
// document, the spec says a named document is always returned, and matching on the identifier would
// only add a way to discard the right row over a disagreement about which spelling is canonical.
export const parseDocumentStats = (rows: unknown): ReefRFCStats | undefined => {
  const { data, error } = z.array(DocumentStatsSchema).safeParse(rows)
  if (error) {
    console.warn('[reef] unexpected shape from the stats operation; the RFC will show no numbers', error)
    return undefined
  }
  const [row] = data
  // An empty array is well-formed but says nothing, and goes unremarked: the spec promises a row for
  // a named document, so this is Reef's business rather than a response worth complaining about.
  return row === undefined ? undefined : documentStatsToReefStats(row)
}

/**
 * The public numbers for one RFC, loaded in the server render so the browser is handed them with the
 * page rather than fetching them for itself.
 *
 * `precomputed` is consulted first and no request is made when it holds anything: the bucket JSON
 * has a reefStats field for exactly this, and once the precomputer fills it the RFC page costs Reef
 * nothing at all. Until then this is where the numbers come from.
 *
 * Both parameters are getters rather than values because an RFC page that navigates to another RFC
 * reuses the same components, so there's no second setup in which to read them again.
 */
export const useRfcReefStats = (
  rfcNumber: () => number,
  precomputed: () => ReefRFCStats | undefined
): Ref<ReefRFCStats | undefined> => {
  const key = computed(() => `reef-stats-${statsDocumentKey(rfcNumber())}`)

  const { data } = useAsyncData(
    key,
    async (): Promise<ReefRFCStats | undefined> => {
      const alreadyKnown = precomputed()
      if (alreadyKnown) {
        return alreadyKnown
      }
      try {
        const rows = await getDocumentStats([statsDocumentKey(rfcNumber())], AbortSignal.timeout(STATS_TIMEOUT_MS))
        return parseDocumentStats(rows)
      } catch (error) {
        // Never rethrown. useAsyncData's error would otherwise be the RFC page's error, and Reef
        // being unreachable is not a reason to fail to serve an RFC.
        console.warn('[reef] unable to load the public numbers for this RFC', error)
        return undefined
      }
    },
    {
      // Fetched on the server so the numbers arrive in the payload, and watched rather than left to
      // setup, so navigating from one RFC to the next reloads them.
      server: true,
      lazy: false,
      watch: [key]
    }
  )

  // useAsyncData is free to hand back null where this promises undefined, and every consumer treats
  // "no numbers" the same way, so the two are normalised to one.
  return computed(() => data.value ?? undefined)
}
