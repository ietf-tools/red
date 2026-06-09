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
import { clearSearchQueryKey, resetHiddenDefaultKey } from '~/utilities/search'

type Props = {
  afterClickFn?: () => void
}

const props = defineProps<Props>()

const clearSearchQuery = inject(clearSearchQueryKey)
const resetHiddenDefault = inject(resetHiddenDefaultKey)

const handleClick = (refine: () => void) => {
  refine() // clear refinements

  if (clearSearchQuery) {
    clearSearchQuery() // clear search query
  } else {
    console.warn('Expected provider of clearSearchQueryKey')
  }

  if (resetHiddenDefault) {
    resetHiddenDefault() // reset hiddenDefault
  } else {
    console.warn('Expected provider of resetHiddenDefaultKey')
  }

  if (props.afterClickFn) {
    props.afterClickFn()
  }
}
</script>
