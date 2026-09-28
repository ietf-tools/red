<template>
  <span
    v-if="unreadCount"
    class="inline-flex items-center justify-center min-w-5 bg-blue-200 text-white rounded-xl shadow-xl px-2 py-2.5 border-1 border-white text-sm font-bold"
    >{{ unreadCount }}</span
  >
</template>

<script setup lang="ts">
const webNotifications = useReefNotificationsStore()

const unreadCount = computed(() => filterNotificationsByUnread(webNotifications.notifications).length)
</script>
