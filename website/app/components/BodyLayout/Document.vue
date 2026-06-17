<template>
  <div class="body-layout-document w-full container m-auto flex flex-row-reverse justify-between lg:gap-5">
    <div :class="['flex py-3 pl-3 hidden w-[var(--sidebar-width)] lg:block', props.sidebarClass]">
      <slot name="sidebar" />
    </div>
    <div class="flex-auto">
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
  container-type: inline-size;
}
</style>
