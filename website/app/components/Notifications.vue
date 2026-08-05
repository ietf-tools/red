<template>
  <ToastProvider v-if="featureFlags.oidc" swipe-direction="right">
    <ToastRoot
      v-for="notification in visibleNotifications"
      :key="notification.id"
      type="background"
      :open="true"
      :duration="TOAST_DURATION_MS"
      class="data-[state=closed]:animate-none data-[swipe=end]:translate-x-full relative flex flex-col gap-1 bg-white dark:bg-black text-black dark:text-white border-1 border-gray-300 dark:border-gray-500 shadow-2xl rounded-xs px-4 py-3 pr-10"
      @update:open="(isOpen: boolean) => !isOpen && dismiss(notification.id)">
      <ToastTitle class="font-bold text-sm">
        {{ notification.title }}
      </ToastTitle>
      <ToastDescription class="text-sm">
        {{ notification.description }}
      </ToastDescription>
      <ToastAction as-child :alt-text="`Go to ${notification.title}`">
        <Anchor
          :href="notification.url"
          class="text-sm underline hover:bg-gray-100 focus:bg-gray-100 dark:hover:bg-gray-800 dark:focus:bg-gray-800 self-start">
          Read more
        </Anchor>
      </ToastAction>
      <ToastClose aria-label="Dismiss notification" class="absolute right-3 top-3 cursor-pointer">
        <GraphicsClose />
      </ToastClose>
    </ToastRoot>
    <ToastViewport
      class="fixed bottom-0 right-0 z-100 flex flex-col gap-2 w-[min(24em,calc(100vw-2rem))] max-w-full m-4 list-none outline-none" />
  </ToastProvider>
</template>

<script setup lang="ts">
import { ToastAction, ToastClose, ToastDescription, ToastProvider, ToastRoot, ToastTitle, ToastViewport } from 'reka-ui'
import { useFeatureFlags } from '~/utilities/feature-flags'
import { useNotificationsStore } from '~/stores/notifications'

const TOAST_DURATION_MS = 10_000

const featureFlags = useFeatureFlags()

const notificationsStore = useNotificationsStore()

const { visibleNotifications } = storeToRefs(notificationsStore)
const { dismiss } = notificationsStore
</script>
