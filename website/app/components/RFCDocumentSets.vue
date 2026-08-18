<template>
  <div class="relative flex flex-col md:flex-row items-center md:gap-2 px-2 py-1">
    <GraphicsAddCircle :class="['text-blue-900 dark:text-blue-100 w-[24px] h-[24px]', COVER_LINK_INNER_STYLE_CLASS]" />
    <div>
      <DialogRoot>
        <DialogTrigger
          :class="[
            'cursor-pointer',
            'rounded',
            'text-center md:text-left',
            'font-bold',
            'text-blue-900 dark:text-blue-100 hover:bg-sky-100 focus:bg-sky-100',
            COVER_LINK_STYLE_CLASS
          ]">
          <span :class="COVER_LINK_INNER_STYLE_CLASS"> Add to set </span>
        </DialogTrigger>
        <DialogPortal>
          <DialogOverlay class="bg-black/10 backdrop-blur-xs fixed inset-0 z-100" />
          <DialogContent
            :class="[
              'fixed top-[50%] left-[50%] max-h-[85vh] w-[90vw] max-w-[550px] translate-x-[-50%] translate-y-[-50%] z-105',
              'focus:outline-none rounded-md shadow-3xl',
              'bg-white dark:bg-gray-800',
              'px-4 pt-3 pb-1'
            ]">
            <DialogTitle class="text-lg font-semibold text-center pb-3">
              <template v-if="!isAuthenticated">You need an account to</template>
              <template v-else>Your sets</template>
            </DialogTitle>

            <DialogDescription class="text-sm">
              <template v-if="isAuthenticated">
                <!-- One checkbox per set, ticked when the set already holds this RFC. Checkboxes
                   rather than an add-only list because the dialog has to show what's already true
                   as well as offer the change, and aria-checked carries both without a live
                   region. There's no save button here for the same reason the rating dialog has
                   none: ticking a row writes. -->
                <CheckboxGroupRoot
                  v-if="props.sets.length > 0"
                  v-model="setIdsWithThisRFC"
                  role="group"
                  :aria-label="`Sets holding RFC ${props.rfcNumber}`"
                  class="flex flex-col gap-1 pb-2">
                  <CheckboxRoot
                    v-for="set in props.sets"
                    :key="set.id"
                    :value="String(set.id)"
                    class="flex items-start gap-2 cursor-pointer w-full text-left py-1">
                    <span
                      class="inline-flex shrink-0 items-center justify-center w-[20px] h-[20px] mt-0.5 border-1 rounded border-current/60">
                      <CheckboxIndicator>
                        <GraphicsCheckmark class="block w-[14px] h-[14px]" />
                      </CheckboxIndicator>
                    </span>
                    <span>{{ set.title }}</span>
                  </CheckboxRoot>
                </CheckboxGroupRoot>

                <!-- Nothing to tick, and nowhere in Red to fix that yet — so this says what's
                   missing rather than leaving an empty dialog that looks broken. -->
                <p v-else class="italic py-3">You have no sets yet.</p>

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
                <LoginModalFeatureWall />
              </template>
            </DialogDescription>

            <DialogClose class="absolute top-2 right-2 px-2 py-2 cursor-pointer" aria-label="Close">
              <GraphicsClose />
            </DialogClose>
          </DialogContent>
        </DialogPortal>
      </DialogRoot>
      <p v-if="props.reefStats?.setCount" :class="['hidden md:block text-xs', COVER_LINK_INNER_STYLE_CLASS]">
        Added to
        {{ formatNumber(props.reefStats.setCount, 0) }}
        <template v-if="props.reefStats.setCount === 1">set</template>
        <template v-else>sets</template>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * The "add to set" dialog for one RFC.
 *
 * Holds no state of its own, the same way the rating and subscribe dialogs don't: which sets hold
 * this RFC is a model, so ticking a row updates the parent's ref and the parent is what persists
 * it — and reports a failure, since it's the only one that knows Reef refused.
 */
import {
  CheckboxGroupRoot,
  CheckboxIndicator,
  CheckboxRoot,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
  DialogTrigger
} from 'reka-ui'
import type { OidcUser } from '~/utilities/oidc'
import type { DocumentSet } from '~/utilities/reef'
import { COVER_LINK_INNER_STYLE_CLASS, COVER_LINK_STYLE_CLASS } from '~/utilities/reef-cover-link'
import type { RfcBucketHtmlDocument } from '~/utilities/rfc-validators.js'

type Props = {
  rfcNumber: number
  reefStats: RfcBucketHtmlDocument['reefStats']
  // The signed-in reader, or undefined when nobody is signed in. Passed in rather than read from
  // the auth store here, so this component renders from what it's given and the parent stays the
  // one place that decides what "signed in" means for this row.
  user: OidcUser | undefined
  // The reader's sets, already in the order they should be listed. Empty while logged out, and
  // empty for a reader who keeps none.
  sets: DocumentSet[]
}

const props = defineProps<Props>()

// The ids of the sets holding this RFC, as strings, because that's what a checkbox group's value
// is. Built by the parent from Reef's own answer.
const setIdsWithThisRFC = defineModel<string[]>({ default: () => [] })

const formatNumber = (val: number, decimalPlaces: number) => {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    minimumFractionDigits: 0,
    maximumFractionDigits: decimalPlaces
  }).format(val)
}

// Reef needs a bearer token to know whose sets to read and change, so an anonymous tick could only
// fail with a 401. Ask for a sign-in instead of letting the checkboxes look interactive and then
// silently lose the change.
const isAuthenticated = computed(() => props.user !== undefined)
</script>
