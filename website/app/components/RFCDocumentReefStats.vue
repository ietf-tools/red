<template>
  <div class="flex">
    <div class="flex flex-row pl-2 gap-3 text-sm">
      <StarRating
        v-if="props.reefStats?.ratingAggregate?.average !== undefined"
        :length="STAR_SCORE_LENGTH"
        disabled
        v-model="props.reefStats.ratingAggregate.average" />
      <StarRatingUnavailable v-else :length="STAR_SCORE_LENGTH" />
      <RFCDocumentRateThisRFC
        :rfc-number="props.rfcNumber"
        :reef-stats="props.reefStats"
        :errata-url="errataForThisRfc"
        v-model="userRFCRating" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { RfcBucketHtmlDocument } from '~/utilities/rfc-validators'
import StarRating from './StarRating.vue'
import { getUserRFCRating, saveUserRFCRating, STAR_SCORE_LENGTH, type UserRFCRating } from '~/utilities/ratings'
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

// Saves get their own controller: a save must not abort an in-flight load, nor a load a save.
let saveController: AbortController | undefined

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

const saveUserRFCRatingChange = async (rating: UserRFCRating) => {
  // undefined is "not rated", never something to write: it's the initial value, and it's what a
  // load leaves behind for a reader who hasn't rated this RFC. Reef has no zero rating and no way
  // to clear one, so there's nothing to send.
  if (rating === undefined || rating === syncedRating) {
    return
  }

  // A deliberate pick supersedes a load that's still open: otherwise the GET lands afterwards,
  // overwrites the reader's choice with the stored value and records it as synced, losing the pick.
  controller?.abort()

  // Last pick wins if the reader changes their mind while a save is still open.
  saveController?.abort()
  saveController = new AbortController()
  const { signal } = saveController

  try {
    await saveUserRFCRating(props.rfcNumber, rating, signal)
    syncedRating = rating
  } catch (error) {
    if (signal.aborted) {
      // superseded by a later rating
      return
    }
    // Leaves the stars showing a rating Reef didn't accept. Worth surfacing to the reader
    // eventually; for now it's a console error rather than a silent divergence.
    console.error('Unable to save your rating for this RFC.', error)
  }
}

watch(userRFCRating, (rating) => {
  void saveUserRFCRatingChange(rating)
})

onBeforeUnmount(() => {
  controller?.abort()
  // Deliberately not aborting saveController: a rating the reader has just set should reach Reef
  // even if they navigate away immediately, and unlike the load there's no stale state for a late
  // response to corrupt.
})
</script>
