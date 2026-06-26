<template>
  <div class="rfc-container mx-auto flex flex-row-reverse body-layout-document lg:gap-5">
    <div :class="['flex pl-3 hidden w-[var(--sidebar-width)] lg:block', props.sidebarClass]">
      <slot name="sidebar" />
    </div>
    <div class="flex-1">
      <slot />
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
