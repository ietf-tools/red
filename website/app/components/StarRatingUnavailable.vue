<template>
  <div class="">
    <GraphicsStarFilled
      v-for="item in props.length"
      :key="item"
      :class="[
        `inline-block`,
        'blur-[2px]',
        `text-white dark:text-black`,
        `transition-colors duration-150`,
        `[--star-stroke-color:var(--color-gray-600)]`,
        `[--star-stroke-length:calc(var(--spacing)*0.5)]`,
        `w-[24px] h-[24px]` // must be 24px+ for accessibility reasons ie minimum button size
      ]" />
  </div>
  <p class="absolute text-sm -mt-6 mb-6 z-100"></p>
</template>

<script setup lang="ts">
type Props = {
  length: number
}

const props = defineProps<Props>()
</script>
