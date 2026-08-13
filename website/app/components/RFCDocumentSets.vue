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
import { COVER_LINK_INNER_STYLE_CLASS, COVER_LINK_STYLE_CLASS } from '~/utilities/ratings'
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
