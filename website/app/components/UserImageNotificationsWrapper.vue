<template>
  <div class="relative pr-7">
    <span
      v-if="unreadCount"
      class="absolute -right-2 -top-2 min-w-5 bg-blue-200 text-white rounded-xl shadow-xl px-1 text-sm font-bold border-1 border-blue-600"
      >{{ unreadCount }}</span
    >
    <slot />
  </div>
</template>

<script setup lang="ts">
const webNotifications = useReefNotificationsStore()

const unreadCount = computed(() => filterNotificationsByUnread(webNotifications.notifications).length)
</script>
