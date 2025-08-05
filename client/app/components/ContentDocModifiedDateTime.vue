<template>
  <HoverCardRoot v-model:open="isHoverCardOpen">
    <HoverCardTrigger as-child>
      <button
        class="mt-10 px-4 -ml-2 py-2 border border-transparent focus:border focus:border-gray-400 rounded-md"
        @focus="isHoverCardOpen = true"
        @mouseover="isHoverCardOpen = true"
        @blur="isHoverCardOpen = false"
      >
        Last updated {{ relativeDate }}
      </button>
    </HoverCardTrigger>
    <HoverCardPortal>
      <HoverCardContent
        class="border shadow-2xl overflow-x-hidden rounded-md bg-white dark:bg-black border-gray-400 dark:border-white px-2 data-[side=bottom]:animate-slideUpAndFade data-[side=right]:animate-slideLeftAndFade data-[side=left]:animate-slideRightAndFade data-[side=top]:animate-slideDownAndFade data-[state=open]:transition-all"
      >
        <p class="font-mono">Last updated {{ fullDate }}</p>
        <HoverCardArrow class="fill-gray-200 stroke-gray-500 -mt-[1px]" />
      </HoverCardContent>
    </HoverCardPortal>
  </HoverCardRoot>
  <p class="hidden print:block font-mono">
    Last updated {{ relativeDate }}, {{ fullDate }}
  </p>
</template>

<script setup lang="ts">
import type { DateTime } from 'luxon'

type Props = {
  modifiedDateTime: DateTime
}

const props = defineProps<Props>()

// Server rendered content should be generic (not have localised date formatting based on server timezone)

// eg. X years ago
const relativeDate = computed(() => props.modifiedDateTime.toRelativeCalendar())

const fullDate = computed(() =>
  props.modifiedDateTime.toISODate()?.replace(
    /T/g,
    // Replace 'T' to allow line wrapping where necessary
    ' '
  )
)

const isHoverCardOpen = ref(false)
</script>
