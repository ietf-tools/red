<template>
  <div class="w-full container m-auto flex flex-row-reverse justify-between lg:gap-5">
    <div :class="['flex p-3 hidden w-[330px] lg:block', props.sidebarClass]">
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
