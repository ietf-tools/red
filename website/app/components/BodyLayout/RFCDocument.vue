<template>
  <div
    class="rfc-container mx-auto flex body-layout-document lg:gap-5"
    :style="props.isSidebarCollapsed ? { '--sidebar-width': COLLAPSED_SIDEBAR_WIDTH } : undefined">
    <div class="flex-1 min-w-0">
      <slot />
    </div>
    <div :class="['flex pl-3 hidden w-[var(--sidebar-width)] lg:block', props.sidebarClass]">
      <slot name="sidebar" />
    </div>
  </div>
</template>

<script setup lang="ts">
type Props = {
  sidebarClass?: string
  isSidebarCollapsed?: boolean
}

const props = defineProps<Props>()

// Wide enough to leave the expand button reachable. Overriding --sidebar-width also reflows the
// xml2rfc.css width calculations that depend on it.
const COLLAPSED_SIDEBAR_WIDTH = '3rem'
</script>

<style>
.body-layout-document {
  container-type: inline-size; /** enabling CQI units in RFC layout */
}
</style>
