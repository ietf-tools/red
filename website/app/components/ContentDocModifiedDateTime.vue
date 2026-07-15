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
const relativeDate = computed(() =>
  props.modifiedDateTime.toRelativeCalendar({
    locale: 'en' // by default would be localised, but we should force English because the website's language is English, and switching to a localised language for just this one part would be odd (and would require lang attributes)
  })
)

const fullDate = computed(() => props.modifiedDateTime.toUTC().toFormat('d MMMM yyyy'))

const isoTimeStamp = computed(() => props.modifiedDateTime.toUTC().toISO() ?? undefined)
</script>
