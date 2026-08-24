<template>
  <div class="flex mt-2">
    <ul class="flex md:flex-row items-start pl-2 text-sm">
      <li class="flex flex-col md:flex-row pr-2">
        <RFCDocumentCommunityRating :reef-stats="props.reefStats" />
        <RFCDocumentRateThisRFC :rfc-number="props.rfcNumber" v-model="userRFCRating" />
      </li>
      <li class="pl-2 pr-2 border-l-1 border-r-1 border-gray-300 dark:border-gray-700">
        <RFCDocumentSubscribe
          :rfc-number="props.rfcNumber"
          :reef-stats="props.reefStats"
          :user="user"
          v-model="isSubscribedToThisRFC" />
      </li>
      <li class="pl-2">
        <RFCDocumentSets
          :rfc-number="props.rfcNumber"
          :reef-stats="props.reefStats"
          :user="user"
          :sets="userSets"
          :create-set="createSet"
          v-model="setIdsWithThisRFC" />
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
 * loading it when the reader or the RFC changes, writing changes back, abandoning a request that
 * has been superseded, putting a checkbox back when Reef refuses — is in the feature's own module,
 * so this component is left doing what a component should: deciding what appears in the row, and
 * handing each dialog the model it binds.
 *
 * The public numbers beside them are not fetched here. They arrive as `props.reefStats`, loaded
 * once in the server render by ~/utilities/reef-stats — above the feature flag that gates this row,
 * which is the only place a loader can be and still run on the server — so a visitor's browser is
 * handed the figures with the page instead of asking Reef for them.
 */
import { useUserRFCRating } from '~/utilities/reef-ratings'
import { useUserSets } from '~/utilities/reef-sets'
import { useUserRFCSubscription } from '~/utilities/reef-subscriptions'
import type { ReefRFCStats } from '~/utilities/rfc-validators'
// import { useRfcEditorErrataSearchForRfcUrl } from '~/utilities/url.js'

type Props = {
  rfcNumber: number
  reefStats: ReefRFCStats | undefined
}

const props = defineProps<Props>()

// const errataForThisRfc = computed(() => useRfcEditorErrataSearchForRfcUrl(props.rfcNumber))

// `user` is passed down to the subscribe and sets dialogs rather than left for them to read from
// the store themselves, so they render from what they're given and this component stays the one
// place that decides what "signed in" means for this row.
const { user } = storeToRefs(useAuthStore())

// A getter rather than the number itself, because each of these watches it: an RFC page that
// navigates to another RFC reuses this component, and every feature has to reload for the new one.
const rfcNumber = () => props.rfcNumber

const userRFCRating = useUserRFCRating(rfcNumber)
const isSubscribedToThisRFC = useUserRFCSubscription(rfcNumber)
const { sets: userSets, setIdsWithThisRFC, createSet } = useUserSets(rfcNumber)
</script>
