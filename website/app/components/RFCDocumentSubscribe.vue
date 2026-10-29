<template>
  <div class="relative flex flex-col md:flex-row md:gap-2 px-2 py-1">
    <div class="flex flex-col">
      <DialogRoot>
        <DialogTrigger
          type="button"
          :class="[
            'flex flex-col sm:flex-row items-center',
            'cursor-pointer',
            'rounded',
            'text-sm text-center md:text-left',
            'font-bold',
            'hover:bg-sky-100 focus:bg-sky-100',
            COVER_LINK_STYLE_CLASS,
            {
              'gap-0': isSubscribedToThisRFC,
              'sm:gap-1': !isSubscribedToThisRFC
            }
          ]">
          <GraphicsCheckmark
            v-if="isSubscribedToThisRFC"
            :class="['text-blue-900 dark:text-blue-100 w-[24px] h-[24px] sm:mr-1', COVER_LINK_INNER_STYLE_CLASS]" />
          <GraphicsAlert
            v-else
            :class="['text-blue-900 dark:text-blue-100 w-[24px] h-[24px] sm:mr-1', COVER_LINK_INNER_STYLE_CLASS]" />
          <span :class="[COVER_LINK_INNER_STYLE_CLASS, { 'sr-only': props.iconOnly }]">
            {{ isSubscribedToThisRFC ? 'Subscribed' : 'Subscribe' }}
          </span>
        </DialogTrigger>
        <DialogPortal>
          <DialogOverlay class="bg-black/10 backdrop-blur-xs fixed inset-0 z-110" />
          <DialogContent
            v-bind="dialogDescriptionAttrs(isAuthenticated)"
            :class="[
              'fixed top-[50%] left-[50%] max-h-[85vh] w-[90vw] translate-x-[-50%] translate-y-[-50%] z-115',
              'focus:outline-none rounded-md shadow-3xl',
              'bg-white dark:bg-gray-800',
              'px-4 pt-3 pb-1',
              {
                'max-w-[550px]': !isAuthenticated,
                'max-w-[350px]': isAuthenticated
              }
            ]">
            <DialogTitle class="text-lg font-semibold text-center pb-3">
              <template v-if="!isAuthenticated">You need an account to</template>
              <template v-else>RFC Subscription</template>
            </DialogTitle>

            <template v-if="isAuthenticated">
              <div class="text-sm pt-3">
                <!-- A checkbox rather than a Subscribe/Unsubscribe button, so the current state is
                   readable without having to infer it from what the button offers to do — and so a
                   screen reader gets the change from aria-checked, which CheckboxRoot maintains,
                   with no live region needed. There's no save button here for the same reason the
                   rating dialog has none: ticking it writes. Disabled rather than hidden until
                   the subscriptions have arrived, so the dialog doesn't change height and an
                   unticked box isn't read as "not subscribed" when it is only not known yet. -->
                <SubscriptionCheckboxHelpText />
                <CheckboxRoot
                  v-model="isSubscribed"
                  :disabled="!isSubscriptionLoaded"
                  class="flex items-start gap-2 w-full text-left cursor-pointer data-[disabled]:cursor-not-allowed data-[disabled]:opacity-60">
                  <span
                    class="inline-flex shrink-0 items-center justify-center w-[20px] h-[20px] mt-0.5 border-1 rounded border-current/60">
                    <CheckboxIndicator>
                      <GraphicsCheckmark class="block w-[14px] h-[14px]" />
                    </CheckboxIndicator>
                  </span>
                  <span
                    >Subscribe to
                    <RFCTitle :rfc="{ number: props.rfcNumber, title: '' }" :hide-title="true" /> changes</span
                  >
                </CheckboxRoot>

                <div class="flex justify-end items-center gap-1 pb-2 pt-4">
                  <AsyncStatusIcon :status="syncStatus" label="your subscription" @retry="emit('retry')" />

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
              </div>
            </template>

            <div v-else class="text-sm pt-3">
              <LoginModalFeatureWall />
            </div>

            <DialogClose class="absolute top-2 right-2 px-2 py-2 cursor-pointer" aria-label="Close">
              <GraphicsClose />
            </DialogClose>
          </DialogContent>
        </DialogPortal>
      </DialogRoot>
      <p
        v-if="props.reefStats?.subscriberCount"
        data-reef-stat
        :class="['hidden md:block sm:pl-8 text-xs', COVER_LINK_INNER_STYLE_CLASS]">
        {{ formatNumber(props.reefStats.subscriberCount, 0) }}
        subscribed
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * The subscribe dialog for one RFC.
 *
 * Holds no state of its own, the same way the rating dialog doesn't: whether the reader is
 * subscribed is a model, so ticking the box updates the parent's ref and the parent is what
 * persists it — and reports a failure, since it's the only one that knows Reef refused.
 */
import {
  CheckboxIndicator,
  CheckboxRoot,
  DialogClose,
  DialogContent,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
  DialogTrigger
} from 'reka-ui'
import { dialogDescriptionAttrs } from '~/utilities/accessibility'
import type { LoadingStatus } from '~/utilities/loading-status'
import type { OidcUser } from '~/utilities/oidc'
import { COVER_LINK_INNER_STYLE_CLASS, COVER_LINK_STYLE_CLASS } from '~/utilities/reef-cover-link'
import type { ReefRFCStats } from '~/utilities/rfc-validators.js'

type Props = {
  rfcNumber: number
  reefStats: ReefRFCStats | undefined
  // The signed-in reader, or undefined when nobody is signed in. Passed in rather than read from
  // the auth store here, so this component renders from what it's given and the parent stays the
  // one place that decides what "signed in" means for this row.
  user: OidcUser | undefined
  // Whether this reader's own half has arrived yet, so the checkbox stays hidden behind a loading
  // message rather than showing unticked before there's a true state to show.
  status: LoadingStatus
  // The same reader's changes as they are saved, for the icon beside the Close button.
  syncStatus: LoadingStatus
  iconOnly?: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{ retry: [] }>()

const isSubscribed = defineModel<boolean>({ default: false })

const isLoading = computed(() => props.status.type === 'loading')
const isSubscriptionLoaded = computed(() => props.status.type === 'success')

const formatNumber = (val: number, decimalPlaces: number) => {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    minimumFractionDigits: 0,
    maximumFractionDigits: decimalPlaces
  }).format(val)
}

// Reef needs a bearer token to know whose subscription to store, so an anonymous tick could only
// fail with a 401. Ask for a sign-in instead of letting the checkbox look interactive and then
// silently lose it.
const isAuthenticated = computed(() => props.user !== undefined)

// Only true once signed in and the checkbox model reflects a loaded subscription, so the trigger
// doesn't flash the subscribed state for a signed-out reader or before the real status has arrived.
const isSubscribedToThisRFC = computed(() => isAuthenticated.value && !isLoading.value && isSubscribed.value)
</script>
