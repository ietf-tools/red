<template>
  <div class="flex mt-2">
    <ul class="flex md:flex-row items-start pl-2 text-sm">
      <li class="flex flex-col md:flex-row pr-2">
        <RFCDocumentCommunityRating :reef-stats="props.reefStats" />
        <RFCDocumentRateThisRFC
          :rfc-number="props.rfcNumber"
          :reef-stats="props.reefStats"
          :errata-url="errataForThisRfc"
          v-model="userRFCRating" />
      </li>
      <li class="pl-2 pr-2 border-l-1 border-r-1 border-gray-300 dark:border-gray-700">
        <RFCDocumentSubscribe :reef-stats="props.reefStats" />
      </li>
      <li class="pl-2">
        <RFCDocumentSets :reef-stats="props.reefStats" />
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import type { RfcBucketHtmlDocument } from '~/utilities/rfc-validators'
import {
  getUserRFCRating,
  ratingRemovalFailedNotification,
  ratingRemovedNotification,
  removeUserRFCRating,
  saveUserRFCRating,
  STAR_SCORE_LENGTH,
  type UserRFCRating
} from '~/utilities/ratings'
import { useRfcEditorErrataSearchForRfcUrl } from '~/utilities/url.js'

type Props = {
  rfcNumber: number
  reefStats: RfcBucketHtmlDocument['reefStats']
}

const errataForThisRfc = computed(() => useRfcEditorErrataSearchForRfcUrl(props.rfcNumber))

const props = defineProps<Props>()

const authStore = useAuthStore()
const { isAuthenticated } = storeToRefs(authStore)

// This reader's own rating, or undefined when they haven't rated the RFC or aren't signed in.
//
// The only thing fetched live. The public aggregate comes from `props.reefStats`, precomputed
// into the bucket JSON — Reef's rating GET happens to return `average`/`count` too, but reading
// those here would mean a per-visitor request for numbers the cached page already carries.
const userRFCRating = ref<UserRFCRating>()

// One controller per attempt, so signing out — or the component going away — abandons a request
// that's still open instead of letting it write the previous user's rating in late.
let controller: AbortController | undefined

// The rating Reef is already holding. `userRFCRating` changes for two quite different reasons — a
// load bringing the stored rating down, or the reader picking a star — and only the second should
// be written back. Recording what came from Reef is what tells them apart; without it, loading an
// existing rating immediately echoes back out as a PUT of the value we just read.
let syncedRating: UserRFCRating

// Writes get their own controller: a write must not abort an in-flight load, nor a load a write.
let writeController: AbortController | undefined

const notificationsStore = useNotificationsStore()

const loadUserRFCRating = async (rfcNumber: number, isAuthed: boolean) => {
  controller?.abort()

  // Reef identifies the rating's owner by the bearer token, so there's nothing to ask for while
  // logged out.
  if (!isAuthed) {
    return
  }

  controller = new AbortController()
  const { signal } = controller

  try {
    const loaded = await getUserRFCRating(rfcNumber, signal)
    // Before the assignment, so the save watcher — which fires on the next tick — already sees
    // this as Reef's own value and leaves it alone.
    syncedRating = loaded
    userRFCRating.value = loaded
  } catch (error) {
    if (signal.aborted) {
      // superseded by a newer attempt, or the component has been unmounted
      return
    }
    // Not worth interrupting the page over: the aggregate stars still render, and the reader's
    // own rating is simply absent.
    console.error('Unable to load your rating for this RFC.', error)
  }
}

// `immediate` is load-bearing, not a convenience. Both gates in front of this component are
// async and client-side — the oidc feature flag comes from localStorage, and oidcRestore() runs
// in Header.vue's onMounted — so a restored session often lands *before* this setup runs, leaving
// isAuthenticated already true with no transition left to observe. Without immediate the callback
// then never fires at all.
watch(
  [isAuthenticated, () => props.rfcNumber],
  () => {
    void loadUserRFCRating(props.rfcNumber, isAuthenticated.value)
  },
  { immediate: true }
)

const persistUserRFCRatingChange = async (rating: UserRFCRating) => {
  // A pick and a removal both arrive here as a change to the model; what tells either of them from
  // a load bringing Reef's own value down is syncedRating. Equal means there's nothing to write —
  // which covers the initial state, where the model and Reef are both undefined and a removal
  // would have nothing to remove.
  if (rating === syncedRating) {
    return
  }

  // A deliberate change supersedes a load that's still open: otherwise the GET lands afterwards,
  // overwrites the reader's choice with the stored value and records it as synced, losing the pick.
  controller?.abort()

  // Last change wins if the reader picks again, or removes, while a write is still open.
  writeController?.abort()
  writeController = new AbortController()
  const { signal } = writeController

  // undefined is the reader withdrawing their rating rather than any value to store, so it's the
  // one case that deletes instead of putting.
  const isRemoval = rating === undefined

  try {
    if (isRemoval) {
      await removeUserRFCRating(props.rfcNumber, signal)
    } else {
      await saveUserRFCRating(props.rfcNumber, rating, signal)
    }
    syncedRating = rating

    if (isRemoval) {
      // Announced only once Reef has accepted it, and only for a removal: picking a star is
      // announced by the live region in the dialog, but the dialog closes on a removal, so this
      // toast is the only report the reader gets.
      notificationsStore.add(ratingRemovedNotification(props.rfcNumber))
    }
  } catch (error) {
    if (signal.aborted) {
      // superseded by a later rating
      return
    }
    if (isRemoval) {
      // The dialog has closed and the stars have already emptied, so leaving it there would show a
      // removal that didn't happen. Put the rating back — the watcher sees it match syncedRating
      // and doesn't try to write it out again — and say so, since there's nothing else on screen
      // that would tell the reader.
      userRFCRating.value = syncedRating
      notificationsStore.add(ratingRemovalFailedNotification(props.rfcNumber))
      console.error('Unable to remove your rating for this RFC.', error)
      return
    }
    // Leaves the stars showing a rating Reef didn't accept. Worth surfacing to the reader
    // eventually; for now it's a console error rather than a silent divergence.
    console.error('Unable to save your rating for this RFC.', error)
  }
}

watch(userRFCRating, (rating) => {
  void persistUserRFCRatingChange(rating)
})

onBeforeUnmount(() => {
  controller?.abort()
  // Deliberately not aborting writeController: a rating the reader has just set, or just removed,
  // should reach Reef even if they navigate away immediately, and unlike the load there's no stale
  // state for a late response to corrupt.
})
</script>
