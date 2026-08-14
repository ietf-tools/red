<template>
  <ToastProvider v-for="position in activePositions" :key="position" swipe-direction="right">
    <ToastRoot
      v-for="notification in notificationsAt(position)"
      :key="notification.id"
      :type="notification.type ?? 'background'"
      :open="true"
      :duration="notification.durationMs ?? DEFAULT_TOAST_DURATION_MS"
      class="data-[state=closed]:animate-none data-[swipe=end]:translate-x-full relative flex flex-col gap-1 bg-white dark:bg-black text-black dark:text-white border-1 border-gray-300 dark:border-gray-500 shadow-2xl rounded-xs px-4 py-3 pr-10"
      @update:open="(isOpen: boolean) => !isOpen && hide(notification.id)">
      <ToastTitle class="font-bold text-sm">
        {{ notification.title }}
      </ToastTitle>
      <ToastDescription v-if="notification.description" class="text-sm">
        {{ notification.description }}
      </ToastDescription>
      <ToastAction v-if="notification.url" as-child :alt-text="`Go to ${notification.title}`">
        <Anchor
          :href="notification.url"
          class="text-sm underline hover:bg-gray-100 focus:bg-gray-100 dark:hover:bg-gray-800 dark:focus:bg-gray-800 self-start">
          Read more
        </Anchor>
      </ToastAction>
      <button
        v-if="notification.allowDismiss"
        type="button"
        aria-label="Dismiss — don't show this notification again"
        class="cursor-pointer text-sm underline hover:bg-gray-100 focus:bg-gray-100 dark:hover:bg-gray-800 dark:focus:bg-gray-800 self-start"
        @click="dismiss(notification)">
        Dismiss
      </button>
      <ToastClose aria-label="Close notification" class="absolute right-3 top-3 cursor-pointer">
        <GraphicsClose />
      </ToastClose>
    </ToastRoot>
    <ToastViewport
      :label="VIEWPORT_LABELS[position]"
      :class="[
        'fixed right-0 z-100 flex flex-col gap-2 w-[min(24em,calc(100vw-2rem))] max-w-full m-4 list-none outline-none',
        position === 'top' ? 'top-0' : 'bottom-0'
      ]" />
  </ToastProvider>
</template>

<script setup lang="ts">
import { ToastAction, ToastClose, ToastDescription, ToastProvider, ToastRoot, ToastTitle, ToastViewport } from 'reka-ui'
import { useFeatureFlags } from '~/utilities/feature-flags'
import { useNotificationsStore, type NotificationPosition } from '~/stores/notifications'

const DEFAULT_TOAST_DURATION_MS = 10_000
const DEFAULT_TOAST_POSITION: NotificationPosition = 'top'

const TOAST_POSITIONS: NotificationPosition[] = ['top', 'bottom']

// Each viewport is its own labelled region, so the two need telling apart. `{hotkey}` is
// substituted by reka with the key that jumps focus here.
const VIEWPORT_LABELS: Record<NotificationPosition, string> = {
  top: 'Notifications ({hotkey})',
  bottom: 'Site announcements ({hotkey})'
}

const featureFlags = useFeatureFlags()

const notificationsStore = useNotificationsStore()

const { visibleNotifications } = storeToRefs(notificationsStore)
const { hide, dismiss } = notificationsStore

const notificationsAt = (position: NotificationPosition) =>
  visibleNotifications.value.filter((notification) => (notification.position ?? DEFAULT_TOAST_POSITION) === position)

// A position only gets a provider once it has something to show. Every mounted viewport binds
// the same hotkey to focus itself, so two of them at once leaves whichever handles it first
// unreachable — keeping the empty one out of the DOM confines that to the rare moment when
// both corners are genuinely occupied, and avoids a hotkey that lands on nothing.
const activePositions = computed(() =>
  featureFlags.value.oidc ? TOAST_POSITIONS.filter((position) => notificationsAt(position).length > 0) : []
)
</script>
