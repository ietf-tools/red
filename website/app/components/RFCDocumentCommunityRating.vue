<template>
  <div class="min-w-32 flex flex-col md:pr-2">
    <StarRating
      v-if="props.reefStats?.ratingAggregate?.average !== undefined"
      :length="STAR_SCORE_LENGTH"
      disabled
      v-model="props.reefStats.ratingAggregate.average" />
    <StarRatingUnavailable v-else :length="STAR_SCORE_LENGTH" />
    <p v-if="props.reefStats?.ratingAggregate" class="text-xs text-center">
      <template v-if="props.reefStats.ratingAggregate.average">
        avg. {{ formatNumber(props.reefStats.ratingAggregate.average, 1) }}
      </template>
      <template v-if="props.reefStats.ratingAggregate.count">
        ({{ formatNumber(props.reefStats.ratingAggregate.count, 0) }} ratings)
      </template>
    </p>
  </div>
</template>

<script setup lang="ts">
import { STAR_SCORE_LENGTH } from '~/utilities/ratings'
import type { RfcBucketHtmlDocument } from '~/utilities/rfc-validators.js'

type Props = {
  reefStats: RfcBucketHtmlDocument['reefStats']
}

const props = defineProps<Props>()

const formatNumber = (val: number, decimalPlaces: number) => {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    minimumFractionDigits: 0,
    maximumFractionDigits: decimalPlaces
  }).format(val)
}
</script>
