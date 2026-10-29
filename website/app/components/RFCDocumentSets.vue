<template>
  <div class="relative flex flex-row md:flex-row md:gap-2 px-2 py-1">
    <div>
      <DialogRoot>
        <DialogTrigger
          type="button"
          :class="[
            'flex flex-col sm:flex-row items-center',
            'cursor-pointer',
            'rounded',
            'text-sm text-center md:text-left',
            'font-bold',
            COVER_LINK_STYLE_CLASS,
            {
              'gap-0': isInASet,
              'sm:gap-1': !isInASet
            }
          ]">
          <GraphicsCheckmark
            v-if="isInASet"
            :class="['text-blue-900 dark:text-blue-100 w-[24px] h-[24px] sm:mr-1', COVER_LINK_INNER_STYLE_CLASS]" />
          <GraphicsAddCircle
            v-else
            :class="['text-blue-900 dark:text-blue-100 w-[24px] h-[24px] sm:mr-1', COVER_LINK_INNER_STYLE_CLASS]" />
          <span :class="[COVER_LINK_INNER_STYLE_CLASS, { 'sr-only': props.iconOnly }]">
            {{
              isInASet
                ? `In ${setIdsWithThisRFC.length} ${setIdsWithThisRFC.length === 1 ? 'Set' : 'Sets'}`
                : 'Add to Set'
            }}
          </span>
        </DialogTrigger>
        <DialogPortal>
          <DialogOverlay class="bg-black/10 backdrop-blur-xs fixed inset-0 z-110" />
          <DialogContent
            v-bind="dialogDescriptionAttrs(isDescribed)"
            :class="[
              'fixed top-[50%] left-[50%] max-h-[85vh] w-[90vw] max-w-[550px] translate-x-[-50%] translate-y-[-50%] z-115',
              'focus:outline-none rounded-md shadow-3xl',
              'bg-white dark:bg-gray-800',
              'px-4 pt-3 pb-1'
            ]">
            <DialogTitle class="text-lg font-semibold text-center pb-3">
              <template v-if="!isAuthenticated">You need an account to</template>
              <template v-else>Your Sets</template>
            </DialogTitle>

            <template v-if="isAuthenticated">
              <div class="text-sm">
                <p v-if="isLoading" class="flex items-center gap-2 py-3">
                  <GraphicsLoading class="inline-block w-5 h-5" />
                  Loading...
                </p>

                <AlertBox v-else-if="status.type === 'error'" variant="warning" role="alert">
                  <p>
                    {{ status.message }}
                    <button type="button" class="underline cursor-pointer" @click="reefStore.load()">Try again</button>
                  </p>
                </AlertBox>

                <div v-else>
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
                    class="mx-auto max-w-[300px] flex flex-col gap-1 pb-2">
                    <DialogDescription class="text-sm italic">
                      Check a Set to add <Component :is="formattedTitle" /> to it.<br />
                      Uncheck to remove it.
                    </DialogDescription>
                    <template v-for="set in props.sets" :key="set.id">
                      <CheckboxRoot
                        :value="set.id"
                        class="flex items-start gap-2 justify-between cursor-pointer w-full text-left py-1">
                        <span
                          class="inline-flex shrink-0 items-center justify-center w-[24px] h-[24px] mt-0.5 border-1 rounded border-current/60">
                          <CheckboxIndicator>
                            <GraphicsCheckmark class="block w-[20px] h-[20px]" />
                          </CheckboxIndicator>
                        </span>
                        <div class="flex-1">
                          <span class="font-bold text-base">{{ set.title }}</span>
                          <div>{{ set.description }}</div>
                        </div>
                        <Anchor
                          :aria-label="`Set '${set.title}'`"
                          :href="setPathBuilder(set.id)"
                          class="relative z-100 bg-gray-200 hover:bg-gray-300 focus:bg-gray-300 dark:bg-gray-900 hover:dark:bg-black focus:dark:bg-black color-black dark:color-black px-1 py-1 rounded-lg">
                          <GraphicsNewWindowIcon class="text-lg align-middle" />
                        </Anchor>
                      </CheckboxRoot>
                    </template>
                  </CheckboxGroupRoot>

                  <!-- Nothing to tick yet. Said rather than left blank, so the reader reads it as
                   an empty list with the Create button below as the way on, rather than as a
                   dialog that failed to load. -->
                  <p v-else class="text-center italic pb-5">You have no Sets yet.</p>
                  <RFCDocumentSetsCreate
                    :rfc-number="props.rfcNumber"
                    :create-set="props.createSet"
                    :has-solid-button="props.sets.length === 0" />
                  <div class="flex justify-end items-center gap-1 pb-2">
                    <AsyncStatusIcon :status="syncStatus" label="your Sets" @retry="emit('retry')" />

                    <DialogClose
                      :class="[
                        'px-3 py-1 rounded-md',
                        'text-white bg-blue-600 dark:bg-blue-900',
                        'font-bold border-1',
                        'cursor-pointer'
                      ]">
                      Done
                    </DialogClose>
                  </div>
                </div>
              </div>
            </template>

            <div v-else class="text-sm">
              <LoginModalFeatureWall />
            </div>

            <DialogClose class="absolute top-2 right-2 px-2 py-2 cursor-pointer" aria-label="Close">
              <GraphicsClose />
            </DialogClose>
          </DialogContent>
        </DialogPortal>
      </DialogRoot>
      <p
        v-if="props.reefStats?.setCount"
        data-reef-stat
        :class="['hidden md:block sm:pl-8 text-xs', COVER_LINK_INNER_STYLE_CLASS]">
        Added to
        {{ formatNumber(props.reefStats.setCount, 0) }}
        <template v-if="props.reefStats.setCount === 1">Set</template>
        <template v-else>Sets</template>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * The "add to Set" dialog for one RFC.
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
import { dialogDescriptionAttrs } from '~/utilities/accessibility'
import type { OidcUser } from '~/utilities/oidc'
import { COVER_LINK_INNER_STYLE_CLASS, COVER_LINK_STYLE_CLASS } from '~/utilities/reef-cover-link'
import type { CreateSetOutcome, NewSet } from '~/utilities/reef-sets'
import { useReefStore, type ReefSet } from '~/stores/reef'
import type { LoadingStatus } from '~/utilities/loading-status'
import type { ReefRFCStats } from '~/utilities/rfc-validators.js'
import { setPathBuilder } from '~/utilities/url'
import { formatTitleAsVNode } from '~/utilities/rfc-title'

type Props = {
  rfcNumber: number
  reefStats: ReefRFCStats | undefined
  // The signed-in reader, or undefined when nobody is signed in. Passed in rather than read from
  // the auth store here, so this component renders from what it's given and the parent stays the
  // one place that decides what "signed in" means for this row.
  user: OidcUser | undefined
  // The reader's sets, already in the order they should be listed. Empty while logged out, and
  // empty for a reader who keeps none.
  sets: ReefSet[]
  // Not called here — handed straight to the create dialog below, which is the only thing that
  // creates a set. It comes from the parent's useUserSets, where the rest of the Reef work for
  // sets lives.
  createSet: (newSet: NewSet) => Promise<CreateSetOutcome>
  // Whether this reader's sets have arrived yet, so the dialog doesn't say they have none before it
  // knows.
  status: LoadingStatus
  // The reader's changes to which Sets hold this RFC as they are saved, for the icon beside Done.
  syncStatus: LoadingStatus
  iconOnly?: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{ retry: [] }>()

const reefStore = useReefStore()

// The ids of the sets holding this RFC — Reef's uuid strings, which is what a checkbox group's
// value is. Built by the parent from Reef's own answer.
const setIdsWithThisRFC = defineModel<string[]>({ default: () => [] })

const formatNumber = (val: number, decimalPlaces: number) => {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    minimumFractionDigits: 0,
    maximumFractionDigits: decimalPlaces
  }).format(val)
}

const formattedTitle = computed(() => formatTitleAsVNode(`rfc${props.rfcNumber}`))

// Reef needs a bearer token to know whose sets to read and change, so an anonymous tick could only
// fail with a 401. Ask for a sign-in instead of letting the checkboxes look interactive and then
// silently lose the change.
const isAuthenticated = computed(() => props.user !== undefined)

const isLoading = computed(() => props.status.type === 'loading')

// Whether any of the reader's sets already holds this RFC, which is what the trigger shows instead
// of the offer to add it. Held back for a signed-out reader and until the sets have loaded, so it
// never claims a membership it hasn't confirmed.
const isInASet = computed(
  () => isAuthenticated.value && props.status.type === 'success' && setIdsWithThisRFC.value.length > 0
)

// Whether the instruction above the Sets, which is what the dialog describes itself with, is on screen.
const isDescribed = computed(
  () => isAuthenticated.value && !isLoading.value && props.status.type !== 'error' && props.sets.length > 0
)
</script>
