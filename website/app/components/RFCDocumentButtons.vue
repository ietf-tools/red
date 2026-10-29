<template>
  <div class="flex mt-2">
    <ul
      data-reef-stats
      class="flex flex-col min-[380px]:flex-row min-[380px]:divide-x min-[380px]:divide-gray-300 gap-2 items-start pl-0.5 text-sm">
      <li class="h-full flex flex-col md:flex-row items-start sm:pr-2">
        <RFCDocumentCommunityRating
          v-if="
            props.reefStats?.ratingAggregate &&
            props.reefStats.ratingAggregate.average &&
            props.reefStats.ratingAggregate.average > 0 // an average of 0 means there are no ratings (users can only rate 1-5)
          "
          :reef-stats="props.reefStats" />
        <RFCDocumentRateThisRFC
          :rfc-number="props.rfcNumber"
          :sync-status="ratingSyncStatus"
          @retry="retryRating"
          v-model="userRFCRating" />
      </li>
      <li class="sm:pr-2">
        <RFCDocumentSubscribe
          :rfc-number="props.rfcNumber"
          :reef-stats="props.reefStats"
          :user="user"
          :status="subscriptionStatus"
          :sync-status="subscriptionSyncStatus"
          @retry="retrySubscription"
          v-model="isSubscribedToThisRFC" />
      </li>
      <li class="sm:pr-2">
        <RFCDocumentSets
          :rfc-number="props.rfcNumber"
          :reef-stats="props.reefStats"
          :user="user"
          :sets="userSets"
          :create-set="createSet"
          :status="setsStatus"
          :sync-status="setsSyncStatus"
          @retry="retrySets"
          v-model="setIdsWithThisRFC" />
      </li>
      <li v-if="featureFlags.hasReadingMode && props.showReadAloud" class="sm:pr-2 print:hidden">
        <RFCReadingModeButton :status="readingStatus" @toggle="toggleReading" />
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
/**
 * The row of Reef features beneath an RFC's title: the community rating, this reader's own rating,
 * whether they're subscribed, and which of their sets hold this RFC.
 *
 * Each feature is one call below. What it takes to keep a per-reader value in step with Reef —
 * writing changes back, queueing them so the last one wins, putting a checkbox back when Reef
 * refuses — is in the feature's own module, so this component is left doing what a component
 * should: deciding what appears in the row, and handing each dialog the model it binds.
 *
 * Loading is not one of those calls. The reader's whole state is loaded when they sign in, so every
 * model below only reads it — the same way a page of fifty search results does.
 *
 * The public numbers beside them are not fetched at all. They arrive as `props.reefStats`, taken
 * from the bucket JSON by RFCDocumentBody, so a visitor's browser is handed them with the page
 * instead of asking Reef for them.
 */
import { useUserRFCRating } from '~/utilities/reef-ratings'
import type { ReefRFCStats } from '~/utilities/rfc-validators'
import { useUserSets } from '~/utilities/reef-sets'
import { useUserRFCSubscription } from '~/utilities/reef-subscriptions'
import { useFeatureFlags } from '~/utilities/feature-flags'
import { useReadingMode } from '~/utilities/reading-mode/use-reading-mode'

type Props = {
  rfcNumber: number
  reefStats: ReefRFCStats | undefined
  showReadAloud?: boolean
}

const props = defineProps<Props>()

// `user` is passed down to the subscribe and sets dialogs rather than left for them to read from
// the store themselves, so they render from what they're given and this component stays the one
// place that decides what "signed in" means for this row.
const { user } = storeToRefs(useAuthStore())

const featureFlags = useFeatureFlags()

const { status: readingStatus, toggle: toggleReading } = useReadingMode()

// A getter rather than the number itself, because each of these follows it: an RFC page that
// navigates to another RFC reuses this component, and every model has to follow it to the new one.
const rfcNumber = () => props.rfcNumber

const { rating: userRFCRating, syncStatus: ratingSyncStatus, retry: retryRating } = useUserRFCRating(rfcNumber)
const {
  isSubscribed: isSubscribedToThisRFC,
  status: subscriptionStatus,
  syncStatus: subscriptionSyncStatus,
  retry: retrySubscription
} = useUserRFCSubscription(rfcNumber)
const {
  sets: userSets,
  setIdsWithThisRFC,
  createSet,
  status: setsStatus,
  syncStatus: setsSyncStatus,
  retry: retrySets
} = useUserSets(rfcNumber)
</script>
