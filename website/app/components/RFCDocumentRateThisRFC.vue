<template>
  <div>
    <DialogRoot>
      <!-- The trigger doubles as the readout, so a reader who has already rated sees their own score
         without opening anything. That leaves the button named after a value, so hidden text adds
         the action; DialogTrigger already announces the dialog itself via aria-haspopup. -->
      <DialogTrigger
        :class="[
          'cursor-pointer',
          'px-3 py-0.5 rounded',
          'text-blue-900 dark:text-blue-100 font-bold hover:text-blue-400 focus:text-blue-400',
          'hover:bg-sky-100 dark:hover:bg-sky-950 focus:bg-sky-100 border-1 border-white dark:border-black focus:border-blue-600 hover:border-blue-600'
        ]">
        {{ userRFCRating === undefined ? 'Rate this RFC' : `Your rating: ${userRFCRating}` }}
        <span v-if="userRFCRating !== undefined" class="sr-only">&mdash; change your rating</span>
      </DialogTrigger>
      <DialogPortal>
        <DialogOverlay class="bg-black/10 backdrop-blur-xs fixed inset-0 z-100" />
        <DialogContent
          :class="[
            'fixed top-[50%] left-[50%] max-h-[85vh] w-[90vw] translate-x-[-50%] translate-y-[-50%] z-105',
            'focus:outline-none rounded-md shadow-3xl',
            'bg-white dark:bg-gray-800',
            'px-4 pt-6 pb-1',
            {
              'max-w-[550px]': !isAuthenticated,
              'max-w-[350px]': isAuthenticated
            }
          ]">
          <DialogTitle
            :class="{
              'text-lg font-semibold text-center pb-3': !isAuthenticated,
              'text-xl font-semibold text-center pb-1': isAuthenticated
            }">
            <template v-if="!isAuthenticated">You need an account to</template>
            <template v-else>Rate RFC {{ props.rfcNumber }}</template>
          </DialogTitle>

          <DialogDescription class="text-sm">
            <template v-if="isAuthenticated">
              <p class="text-center">Select a rating between 1 and 5</p>
              <div class="flex flex-col items-center justify-center gap-1 py-3">
                <div class="px-4 py-2">
                  <StarRating
                    :length="STAR_SCORE_LENGTH"
                    v-model="userRFCRating"
                    :aria-label="`Your rating out of ${STAR_SCORE_LENGTH} stars`" />
                  <!-- Announces the change, since picking a star saves without any further confirmation. -->
                  <p class="sr-only" aria-live="polite" aria-atomic="true">
                    {{ userRFCRatingLabel(userRFCRating) }}
                  </p>
                </div>
              </div>
              <div class="flex justify-between pb-2">
                <span>
                  <!-- Removing is a change to the rating like picking a star is, so it goes out the
                     same way — through the model, leaving the parent to persist it and to announce
                     the outcome. DialogClose wraps it because the dialog can't stay open over an
                     empty set of stars: it exists to show the reader their rating, and there is no
                     longer one to show. -->
                  <DialogClose v-if="userRFCRating !== undefined" as-child>
                    <button
                      type="button"
                      class="cursor-pointer border-1 border-blue-500 px-2 py-1 rounded text-gray-900 dark:text-gray-100"
                      @click="userRFCRating = undefined">
                      Remove rating
                    </button>
                  </DialogClose>
                </span>
                <DialogClose
                  :class="[
                    'px-3 py-1 rounded-md',
                    'text-white bg-blue-600 dark:bg-blue-900 font-bold',
                    'border border-gray-400',
                    'cursor-pointer'
                  ]">
                  Done
                </DialogClose>
              </div>
            </template>

            <template v-else>
              <LoginModalFeatureWall />
            </template>
          </DialogDescription>

          <DialogClose class="absolute top-2 right-2 px-2 py-2 cursor-pointer" aria-label="Close">
            <GraphicsClose />
          </DialogClose>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>
  </div>
</template>

<script setup lang="ts">
/**
 * The "your rating" dialog for one RFC.
 *
 * Holds no state of its own: the rating is a model, so picking a star — or removing the rating
 * altogether — updates the parent's ref and the parent is what persists it. There's deliberately no
 * save button — the parent writes on change, and offering one would imply the pick hadn't already
 * been saved.
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
import { STAR_SCORE_LENGTH, userRFCRatingLabel } from '~/utilities/reef-ratings'
import type { RfcBucketHtmlDocument } from '~/utilities/rfc-validators.js'

type Props = {
  rfcNumber: number
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
