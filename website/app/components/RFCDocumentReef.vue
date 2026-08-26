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
 * writing changes back, queueing them so the last one wins, putting a checkbox back when Reef
 * refuses — is in the feature's own module, so this component is left doing what a component
 * should: deciding what appears in the row, and handing each dialog the model it binds.
 *
 * Loading is not one of those calls. useReefDocuments declares the one document this row is about,
 * and every model below then reads what came back — the same one call a page of fifty search
 * results makes for all fifty.
 *
 * The public numbers beside them are not fetched at all. They arrive as `props.reefStats`, taken
 * from the bucket JSON by RFCDocumentBody, so a visitor's browser is handed them with the page
 * instead of asking Reef for them.
 */
import { useReefDocuments } from '~/utilities/reef-documents'
import { useUserRFCRating } from '~/utilities/reef-ratings'
import type { ReefRFCStats } from '~/utilities/rfc-validators'
import { useUserSets } from '~/utilities/reef-sets'
import { useUserRFCSubscription } from '~/utilities/reef-subscriptions'
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

// A getter rather than the number itself, because each of these follows it: an RFC page that
// navigates to another RFC reuses this component, and every model has to follow it to the new one.
const rfcNumber = () => props.rfcNumber

useReefDocuments(() => [props.rfcNumber])

const userRFCRating = useUserRFCRating(rfcNumber)
const isSubscribedToThisRFC = useUserRFCSubscription(rfcNumber)
const { sets: userSets, setIdsWithThisRFC, createSet } = useUserSets(rfcNumber)
</script>
