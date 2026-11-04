<template>
  <button
    type="button"
    :aria-label="isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'"
    :aria-expanded="!isSidebarCollapsed"
    :class="[
      'group',
      'absolute top-0 -left-2',
      {
        'cursor-e-resize': !isSidebarCollapsed,
        'cursor-w-resize': isSidebarCollapsed
      },
      'bg-white dark:bg-black hover:bg-gray-400 dark:hover:bg-gray-500 dark:focus:bg-gray-500',
      'before:content-[\'\'] before:absolute before:right-0 before:w-2 before:h-screen hover:before:bg-gray-200 dark:hover:before:bg-gray-500 focus:before:bg-gray-200 dark:focus:before:bg-gray-500'
    ]"
    @click="uiSettings.toggleRfcSidebar()">
    <GraphicsLayoutSidebarRightCollapse
      :class="[
        'absolute right-0 top-3.5 w-6 h-6 outline-2 outline-white bg-white dark:bg-black dark:outline-black group-hover:bg-gray-200 dark:group-hover:bg-gray-500 group-focus:bg-gray-200 dark:group-focus:bg-gray-500 group-hover:outline-0 group-focus:outline-0 group-hover:text-gray-700 dark:group-hover:text-white dark:group-focus:text-white group-focus:text-gray-700',
        { 'rotate-180': isSidebarCollapsed }
      ]" />
  </button>
</template>

<script setup lang="ts">
/**
 * This should only be used on RFCTabs mode=desktop
 */
const uiSettings = useUiSettingsStore()

const isSidebarCollapsed = computed(() => uiSettings.isRfcSidebarEffectivelyCollapsed)
</script>
