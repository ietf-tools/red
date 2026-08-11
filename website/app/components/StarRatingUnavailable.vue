<template>
  <div class="flex">
    <div class="w-0 whitespace-nowrap">
      <GraphicsStarFilled
        v-for="item in props.length"
        :key="item"
        :class="[
          `inline-block`,
          'blur-[2px]',
          `text-yellow-100 dark:text-black`,
          `transition-colors duration-150`,
          `[--star-stroke-color:var(--color-yellow-200)]`,
          `[--star-stroke-length:calc(var(--spacing)*0.5)]`,
          `w-[24px] h-[24px]` // must be 24px+ for accessibility reasons ie minimum button size
        ]" />
    </div>
    <div
      class="w-[calc(5*24px)] text-center uppercase pt-1 text-shadow-lg text-shadow-white font-extrabold text-yellow-900 relative z-2">
      no rating
    </div>
  </div>
</template>

<script setup lang="ts">
type Props = {
  length: number
}

const props = defineProps<Props>()
</script>
