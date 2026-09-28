<template>
  <span
    v-if="unreadCount"
    class="inline-flex items-center justify-center min-w-5 bg-yellow-200 text-yellow-800 rounded-xl shadow-xl px-1 text-sm font-bold"
    >{{ unreadCount }}</span
  >
</template>

<script setup lang="ts">
const webNotifications = useReefNotificationsStore()

const unreadCount = computed(() => filterNotificationsByUnread(webNotifications.notifications).length)
</script>
