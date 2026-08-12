<template>
  <RatingRoot v-slot="{ items }" v-model="rating" :disabled="props.disabled">
    <RatingItem v-for="item in items" :key="item" v-slot="{ steps }" :item="item">
      <RatingItemIndicator
        v-for="step in steps"
        :key="step"
        :step="step"
        :class="[
          `overflow-hidden rounded`,
          !props.disabled && `cursor-pointer`,
          `text-gray-200 data-[state=active]:text-yellow-400 dark:text-gray-700 dark:data-[state=active]:text-yellow-500`,
          `transition-colors duration-150`,
          `[--star-stroke-color:var(--color-gray-600)] data-[state=active]:[--star-stroke-color:var(--color-yellow-700)]`,
          `[--star-stroke-length:calc(var(--spacing)*0.25)] data-[state=active]:[--star-stroke-length:calc(var(--spacing)*0.5)]`,
          `focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-950`
        ]">
        <GraphicsStarFilled
          :class="[
            `w-[24px] h-[24px]` // must be 24px+ for accessibility reasons ie minimum button size
          ]" />
      </RatingItemIndicator>
    </RatingItem>
  </RatingRoot>
</template>

<script setup lang="ts">
import { RatingRoot, RatingItem, RatingItemIndicator } from 'reka-ui'

type Props = {
  disabled?: boolean
}

const props = defineProps<Props>()

const rating = defineModel<number>()
</script>
