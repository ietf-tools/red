<template>
  <details class="details-open-style">
    <summary
      class="flex justify-between hover:bg-gray-200 focus:bg-gray-200 dark:hover:bg-gray-700 dark:focus:bg-gray-700 rounded p-2 cursor-pointer"
    >
      <span class="font-bold">
        <GraphicsDiamond class="align-middle" color="yellow" size="10px" />
        Section
        {{ props.errataItem.section }}
      </span>
    </summary>
    {{ props.errataItem }}
  </details>
</template>
<script setup lang="ts">
import type { ErrataItem } from '~/utilities/rfc-validators'

type Props = {
  errataItem: ErrataItem
}

const props = defineProps<Props>()
</script>

<style>
.details-open-style > summary::after {
  content: '+';
  font-weight: bold;
  display: inline-block;
}

.details-open-style[open] > summary::after {
  content: '-';
}
</style>
