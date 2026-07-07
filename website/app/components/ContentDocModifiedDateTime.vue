<template>
  <p class="mt-8 pl-2 italic font-semibold">
    Last updated <time :datetime="isoTimeStamp">{{ relativeDate }}, on {{ fullDate }}</time
    >.
  </p>
</template>

<script setup lang="ts">
import { DateTime } from 'luxon'

type Props = {
  modifiedDateTime: DateTime
}

const props = defineProps<Props>()

// eg. X years ago
const relativeDate = computed(() => props.modifiedDateTime.toRelativeCalendar())

const fullDate = computed(() => props.modifiedDateTime.toUTC().toFormat('d MMMM yyyy'))

const isoTimeStamp = computed(() => props.modifiedDateTime.toUTC().toISO() ?? undefined)
</script>
