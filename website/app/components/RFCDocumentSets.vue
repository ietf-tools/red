<template>
  <div class="">
    <DialogRoot>
      <DialogTrigger
        :class="[
          'cursor-pointer',
          'pl-2 pr-3 py-1 rounded',
          'flex flex-row gap-2 items-center',
          'text-blue-900 bg-sky-100 border-1 border-blue-500 font-bold'
        ]">
        <GraphicsAlert class="w-[20px] h-[20px]" /> Add to set
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
          <DialogTitle class="text-lg font-semibold">Your sets</DialogTitle>

          <template v-if="isAuthenticated">
            <DialogDescription class="text-sm"> ... </DialogDescription>

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
                Sign in
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
            </DialogDescription>
          </template>

          <DialogClose class="absolute top-2 right-2 px-2 py-2 cursor-pointer" aria-label="Close">
            <GraphicsClose />
          </DialogClose>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>
    <div v-if="props.reefStats?.setCount" class="mt-1">
      <p>
        {{ formatNumber(props.reefStats.setCount, 0) }}
        <template v-if="props.reefStats.setCount === 1">set</template>
        <template v-else>sets</template>
        added to
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * The subscribe dialog for one RFC.
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
import { oidcLogin } from '~/utilities/oidc'
import type { RfcBucketHtmlDocument } from '~/utilities/rfc-validators.js'

type Props = {
  reefStats: RfcBucketHtmlDocument['reefStats']
}

const props = defineProps<Props>()

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
