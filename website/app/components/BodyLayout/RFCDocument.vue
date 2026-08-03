<template>
  <div class="rfc-c mx-auto flex body-layout-document lg:gap-5">
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
}

const props = defineProps<Props>()
</script>

<style>
.body-layout-document {
  container-type: inline-size; /** enabling CQI units in RFC layout */
}
</style>
