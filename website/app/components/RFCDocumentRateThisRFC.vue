<template>
  <div class="border-r-1 border-r-gray-300 pr-2">
    <DialogRoot>
      <!-- The trigger doubles as the readout, so a reader who has already rated sees their own score
         without opening anything. That leaves the button named after a value, so hidden text adds
         the action; DialogTrigger already announces the dialog itself via aria-haspopup. -->
      <DialogTrigger
        :class="['cursor-pointer', 'px-3 py-1 rounded', 'text-blue-900 bg-sky-100 border-1 border-blue-500 font-bold']">
        {{ userRFCRating === undefined ? 'Rate this RFC' : `Your rating: ${userRFCRatingLabel(userRFCRating)}` }}
        <span v-if="userRFCRating !== undefined" class="sr-only">&mdash; change your rating</span>
      </DialogTrigger>
      <DialogPortal>
        <DialogOverlay class="bg-black/10 backdrop-blur-xs fixed inset-0 z-30" />
        <DialogContent
          :class="[
            'fixed top-[50%] left-[50%] max-h-[85vh] w-[90vw] max-w-[450px] translate-x-[-50%] translate-y-[-50%] z-[100]',
            'focus:outline-none rounded-md shadow-3xl',
            'bg-white dark:bg-gray-800',
            'px-4 py-3'
          ]">
          <DialogTitle class="text-lg font-semibold">Your rating</DialogTitle>

          <template v-if="isAuthenticated">
            <DialogDescription class="text-sm">
              Your own rating of this RFC. It's saved as soon as you choose, and counts towards the average shown for
              this RFC. The average is not updated live.
            </DialogDescription>

            <div class="flex flex-col items-center justify-center gap-1 py-3">
              <div class="bg-gray-100 dark:bg-blue-950 border border-gray-400 rounded-md px-4 py-2">
                <StarRating
                  :length="STAR_SCORE_LENGTH"
                  v-model="userRFCRating"
                  :aria-label="`Your rating out of ${STAR_SCORE_LENGTH} stars`" />
                <!-- Announces the change, since picking a star saves without any further confirmation. -->
                <p class="text-sm" aria-live="polite" aria-atomic="true">
                  {{ userRFCRatingLabel(userRFCRating) }}
                </p>
              </div>
            </div>
            <div class="flex justify-end pb-2">
              <DialogClose
                :class="[
                  'px-3 py-1 rounded-md',
                  'text-white bg-blue-600 dark:bg-blue-900',
                  'border border-gray-400',
                  'cursor-pointer'
                ]">
                Done
              </DialogClose>
            </div>
          </template>

          <template v-else>
            <DialogDescription class="text-sm py-3">
              <p>
                Ratings are saved to your account, so you'll need to sign in to rate this RFC. Your rating contributes
                toward an average.
                <br />

                <button
                  v-if="!isAuthenticated"
                  type="button"
                  :class="[
                    'my-3 px-3 py-1 rounded-md',
                    'text-white bg-blue-600 dark:bg-blue-900',
                    'border',
                    'cursor-pointer'
                  ]"
                  @click="oidcLogin">
                  Login
                </button>
              </p>

              <p class="mt-2">
                If you have technical feedback, please also consider
                <Anchor :href="props.errataUrl">reporting a new erratum <NewWindowIcon /></Anchor>.
              </p>
            </DialogDescription>
          </template>

          <DialogClose class="absolute top-2 right-2 px-2 py-2 cursor-pointer" aria-label="Close">
            <GraphicsClose />
          </DialogClose>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>
    <div v-if="props.reefStats?.ratingAggregate" class="mt-1">
      <p>
        <template v-if="props.reefStats.ratingAggregate.count">
          {{ formatNumber(props.reefStats.ratingAggregate.count, 0) }} ratings
        </template>
        <template v-if="props.reefStats.ratingAggregate.average">
          (avg.
          {{ formatNumber(props.reefStats.ratingAggregate.average, 1) }})
        </template>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * The "your rating" dialog for one RFC.
 *
 * Holds no state of its own: the rating is a model, so picking a star updates the parent's ref and
 * the parent is what persists it. There's deliberately no save button — the parent writes on
 * change, and offering one would imply the pick hadn't already been saved.
 */
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
  DialogTrigger
} from 'reka-ui'
import { STAR_SCORE_LENGTH, userRFCRatingLabel } from '~/utilities/ratings'
import { oidcLogin } from '~/utilities/oidc'
import NewWindowIcon from './Graphics/NewWindowIcon.vue'
import type { RfcBucketHtmlDocument } from '~/utilities/rfc-validators.js'

type Props = {
  errataUrl: string
  reefStats: RfcBucketHtmlDocument['reefStats']
}

const props = defineProps<Props>()

const userRFCRating = defineModel<number | undefined>()

const formatNumber = (val: number, decimalPlaces: number) => {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    minimumFractionDigits: 0,
    maximumFractionDigits: decimalPlaces
  }).format(val)
}

// Reef needs a bearer token to know whose rating to store, so an anonymous pick can only fail with
// a 401. Ask for a sign-in instead of letting the stars look interactive and then silently lose it.
const authStore = useAuthStore()
const { isAuthenticated } = storeToRefs(authStore)
</script>
