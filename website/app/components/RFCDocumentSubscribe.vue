<template>
  <div class="relative flex flex-col md:flex-row md:gap-2 px-2 py-1">
    <div class="flex flex-col">
      <DialogRoot>
        <DialogTrigger
          type="button"
          :class="[
            'flex flex-col sm:flex-row gap-1 items-center',
            'cursor-pointer',
            'rounded',
            'text-sm text-center md:text-left',
            'font-bold',
            'hover:bg-sky-100 focus:bg-sky-100',
            COVER_LINK_STYLE_CLASS
          ]">
          <GraphicsAlert
            :class="['text-blue-900 dark:text-blue-100 w-[24px] h-[24px] sm:mr-1', COVER_LINK_INNER_STYLE_CLASS]" />
          <span :class="[COVER_LINK_INNER_STYLE_CLASS, { 'sr-only': props.iconOnly }]"> Subscribe </span></DialogTrigger
        >
        <DialogPortal>
          <DialogOverlay class="bg-black/10 backdrop-blur-xs fixed inset-0 z-110" />
          <DialogContent
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

            <DialogDescription class="text-sm pt-3">
              <template v-if="isAuthenticated">
                <!-- A separate hidden region rather than aria-live on the paragraph itself, so the
                   announcement doesn't sit inside the same element the checkbox later renders into —
                   nesting a live region around an interactive control it would otherwise re-announce
                   on every tick, which this avoids by only ever holding this one status string. -->
                <span class="sr-only" aria-live="polite" aria-atomic="true">{{ loadAnnouncement }}</span>

                <p v-if="isLoading" class="flex items-center gap-2 py-3">
                  <GraphicsLoading class="inline-block w-5 h-5" />
                  Loading...
                </p>

                <template v-else>
                  <!-- A checkbox rather than a Subscribe/Unsubscribe button, so the current state is
                     readable without having to infer it from what the button offers to do — and so a
                     screen reader gets the change from aria-checked, which CheckboxRoot maintains,
                     with no live region needed. There's no save button here for the same reason the
                     rating dialog has none: ticking it writes. -->
                  <SubscriptionCheckboxHelpText />
                  <CheckboxRoot v-model="isSubscribed" class="flex items-start gap-2 cursor-pointer w-full text-left">
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
                </template>

                <div class="flex justify-end pb-2 pt-4">
                  <DialogClose
                    :class="[
                      'px-3 py-1 rounded-md',
                      'text-white bg-blue-600 dark:bg-blue-900',
                      'border border-gray-400',
                      'cursor-pointer'
                    ]">
                    Close
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
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
  DialogTrigger
} from 'reka-ui'
import type { ReefDocumentStatus } from '~/stores/reef'
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
  status: ReefDocumentStatus
  iconOnly?: boolean
}

const props = defineProps<Props>()

const isSubscribed = defineModel<boolean>({ default: false })

const isLoading = computed(() => props.status === 'unknown' || props.status === 'loading')

// Whether a load has been seen in flight, so `loadAnnouncement` only speaks up once loading
// actually happened. Without it, a dialog opened after the load already settled — the common case,
// since it starts as soon as the page does — would announce "loaded" for something the reader
// never saw as pending.
const hasLoaded = ref(false)
watch(
  isLoading,
  (loading) => {
    if (loading) {
      hasLoaded.value = true
    }
  },
  { immediate: true }
)

const loadAnnouncement = computed(() => {
  if (isLoading.value) {
    return 'Loading your Subscription status.'
  }
  return hasLoaded.value ? 'Subscription status loaded.' : ''
})

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
</script>
