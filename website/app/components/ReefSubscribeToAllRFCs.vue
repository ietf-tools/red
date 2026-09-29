<template>
  <div class="mt-5 lg:mt-0 relative flex flex-col md:flex-row md:gap-2">
    <div class="flex flex-col">
      <DialogRoot>
        <DialogTrigger
          type="button"
          :class="[
            'text-pretty flex flex-row gap-2 cursor-pointer px-2 md:px-3 py-1 md:py-2 font-bold border-[2px]',
            {
              'text-white bg-blue-300 border-blue-300 dark:bg-blue-600 dark:border-blue-600 hover:bg-blue-400 focus:bg-blue-400 dark:hover:bg-blue-700 dark:focus:bg-blue-700 dark:hover:border-blue-700 dark:focus:border-blue-700':
                isSubscribedToAll,
              'text-blue-300 dark:text-blue-100 border-blue-300 dark:border-blue-200 hover:bg-blue-25 focus:bg-blue-25 dark:hover:bg-blue-950 dark:focus:bg-blue-950':
                !isSubscribedToAll
            }
          ]">
          <GraphicsCheckmark v-if="isSubscribedToAll" class="hidden sm:inline-block text-white w-[24px] h-[24px]" />
          <GraphicsAlert v-else class="hidden lg:inline-block text-blue-300 dark:text-blue-100 w-[24px] h-[24px]" />
          {{ isSubscribedToAll ? 'Subscribed to new RFCs' : 'Subscribe to new RFCs' }}
        </DialogTrigger>
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
              <template v-else>New RFCs subscription</template>
            </DialogTitle>

            <DialogDescription class="text-sm pt-3">
              <template v-if="isAuthenticated">
                <!-- A separate hidden region rather than aria-live on the paragraph itself, so the
                   announcement doesn't sit inside the same element the checkbox later renders into —
                   nesting a live region around an interactive control it would otherwise re-announce
                   on every tick, which this avoids by only ever holding this one status string. -->
                <span class="sr-only" aria-live="polite" aria-atomic="true">{{ loadAnnouncement }}</span>

                <p v-if="status.type === 'loading'" class="flex items-center gap-2 py-3">
                  <GraphicsLoading class="inline-block w-5 h-5" />
                  Loading...
                </p>

                <div v-else>
                  <p class="mb-5">Check to subscribe. Uncheck to unsubscribe.</p>
                  <CheckboxRoot v-model="isSubscribed" class="flex items-start gap-2 cursor-pointer w-full text-left">
                    <span
                      class="inline-flex shrink-0 items-center justify-center w-[20px] h-[20px] mt-0.5 border-1 rounded border-current/60">
                      <CheckboxIndicator>
                        <GraphicsCheckmark class="block w-[14px] h-[14px]" />
                      </CheckboxIndicator>
                    </span>
                    <span>Subscribe to new RFCs</span>
                  </CheckboxRoot>
                </div>

                <div class="flex justify-end pb-2 pt-4">
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
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * The subscribe dialog for all new RFCs.
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
import { useUserNewRfcSubscription } from '~/utilities/reef-subscriptions'

const { isSubscribed, status } = useUserNewRfcSubscription()

const isLoading = computed(() => status.value.type === 'loading')

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
    return 'Loading your subscription status.'
  }
  return hasLoaded.value ? 'Subscription status loaded.' : ''
})

// `user` is passed down to the subscribe and sets dialogs rather than left for them to read from
// the store themselves, so they render from what they're given and this component stays the one
// place that decides what "signed in" means for this row.
const { user } = storeToRefs(useAuthStore())

// Reef needs a bearer token to know whose subscription to store, so an anonymous tick could only
// fail with a 401. Ask for a sign-in instead of letting the checkbox look interactive and then
// silently lose it.
const isAuthenticated = computed(() => user.value !== undefined)

// Only true once signed in and the checkbox model reflects a loaded subscription, so the trigger
// doesn't flash the subscribed style for a signed-out reader or before the real status has arrived.
const isSubscribedToAll = computed(() => isAuthenticated.value && !isLoading.value && isSubscribed.value)
</script>
