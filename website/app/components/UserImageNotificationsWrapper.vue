<template>
  <div :class="['relative pr-4', unreadCount > 0 ? 'pl-2' : '']">
    <span
      v-if="unreadCount"
      class="absolute -left-1 min-w-5 -top-1 bg-yellow-200 text-yellow-800 rounded-xl shadow-xl px-1 text-sm font-bold border-1 border-yellow-600"
      >{{ unreadCount }}</span
    >
    <slot />
  </div>
</template>

<script setup lang="ts">
const webNotifications = useReefNotificationsStore()

const unreadCount = computed(() => filterNotificationsByUnread(webNotifications.notifications).length)
</script>
