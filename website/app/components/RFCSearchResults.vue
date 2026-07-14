<template>
  <div :id="INSTANTSEARCH_HITS_CONTAINER_DOM_ID">
    <div
      v-if="isEmpty"
      class="rounded-xs bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-200 flex flex-col items-center justify-center px-3 py-5">
      <GraphicsValueNone class="size-[5em] text-gray-300" />
      <span class="mt-3">No RFCs match your search query and active filters.</span>
      <div v-if="!searchObsoleted" class="mt-3 text-center leading-7">
        Didn't find what you were looking for?<br />
        Obsoleted / historic RFCs are excluded, which may hide results.<br />
        <button
          type="button"
          class="mt-1 border-1 px-2 py-1 border-black dark:border-white cursor-pointer hover:bg-gray-300 focus:bg-gray-300 dark:hover:bg-gray-700 dark:focus:bg-gray-700"
          @click="refine(true)">
          Search obsoleted / historic
        </button>
      </div>
    </div>
    <SearchResultList v-else :items="items" />
  </div>
</template>

<script setup lang="ts">
import { nextTick, watch } from 'vue'
import { useHits, useToggleRefinement } from '~/components/searchv2'
import { INSTANTSEARCH_HITS_CONTAINER_DOM_ID, moveFocusToFirstResult } from '~/utilities/typesense'
import type { TypeSenseSearchItem } from '~/utilities/typesense'

const props = defineProps<{
  /** Set by the host after a pagination action; focus moves once new results render. */
  pendingFocus?: boolean
}>()
const emit = defineEmits<{ focused: [] }>()

const { items, isEmpty } = useHits<TypeSenseSearchItem>()
const { value: searchObsoleted, refine } = useToggleRefinement({ attribute: 'searchObsoleted' })

// G4: move focus to the first result only after the new results have rendered,
// avoiding the race where focus moves before pagination results arrive.
watch(items, async () => {
  if (!props.pendingFocus) return
  await nextTick()
  moveFocusToFirstResult()
  emit('focused')
})
</script>
