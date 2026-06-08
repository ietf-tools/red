<template>
  <ais-clear-refinements :excluded-attributes="['type', 'flags.hiddenDefault', 'flags.updated']">
    <template #default="{ canRefine, refine }">
      <button
        v-show="canRefine"
        type="reset"
        class="underline text-sky-700 dark:text-blue-100 px-3 py-0 -ml-3 cursor-pointer"
        @click.prevent="handleClick(refine)">
        Clear all
      </button>
    </template>
  </ais-clear-refinements>
</template>

<script setup lang="ts">
import { AisClearRefinements } from 'vue-instantsearch/vue3/es'
import { clearSearchQueryKey } from '~/utilities/search'

type Props = {
  afterClickFn?: () => void
}

const props = defineProps<Props>()

const clearSearchQuery = inject(clearSearchQueryKey)

const handleClick = (refine: () => void) => {
  refine()
  if (clearSearchQuery) {
    clearSearchQuery()
  } else {
    console.warn('Expected provider of clearSearchQueryKey')
  }
  if (props.afterClickFn) {
    props.afterClickFn()
  }
}
</script>
