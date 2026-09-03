<template>
  <!-- Deliberately not a GET form to anywhere: the worker strips the query string from everything
     it fetches from Nuxt, so a submitted filter would come back as the unfiltered index. Filtering
     is the browser's job here and the box says so by being inert until the browser has it, which is
     also why it is rendered rather than withheld — it holds its own space, so nothing below it
     moves when scripting arrives. Enter is stopped for the same reason the action is absent. -->
  <form role="search" aria-label="Filter subjects" class="flex flex-col gap-1" @submit.prevent>
    <label :for="inputDomId" class="text-blue-950 dark:text-white font-bold">Filter subjects</label>
    <div class="flex w-full max-w-lg">
      <input
        :id="inputDomId"
        ref="filter-input"
        v-model="query"
        type="search"
        :disabled="!isMounted"
        :aria-describedby="hintDomId"
        class="flex-1 min-w-0 h-11 pl-4 pr-2 py-2 text-black dark:text-white bg-white dark:bg-black border-1 border-gray-400 rounded-md disabled:bg-gray-100 dark:disabled:bg-gray-900"
        autocomplete="off"
        autocorrect="off"
        autocapitalize="off"
        spellcheck="false"
        @keydown.esc="clear" />
      <button
        v-if="query.length > 0"
        type="button"
        class="cursor-pointer ml-2 px-3 flex items-center text-black dark:text-white bg-white dark:bg-black border-1 border-gray-400 rounded-md"
        aria-label="Clear the filter"
        @click="clear">
        <GraphicsDismiss class="size-[1.2em]" />
      </button>
    </div>
    <p :id="hintDomId" class="text-sm italic text-black dark:text-white">Matches subject names and descriptions.</p>
    <!-- The count is announced rather than only drawn, because what a keystroke changes is further
       down the page than the box being typed into. Debounced so that a typed word settles into one
       announcement instead of one per letter. -->
    <p role="status" aria-live="polite" class="sr-only">{{ announced }}</p>
  </form>
</template>

<script setup lang="ts">
import { useId } from 'vue'
import { watchDebounced } from '@vueuse/core'

const query = defineModel<string>({ required: true })

const { matchCount, totalCount } = defineProps<{
  matchCount: number
  totalCount: number
}>()

const inputDomId = useId()
const hintDomId = useId()

const filterInputRef = useTemplateRef<HTMLInputElement>('filter-input')

const isMounted = ref(false)

onMounted(() => {
  isMounted.value = true
})

// Clearing unmounts the button that was clicked, so focus is put back on the box rather than left
// on nothing, which is also where someone who has just cleared a filter wants to be.
const clear = () => {
  query.value = ''
  filterInputRef.value?.focus()
}

const ANNOUNCEMENT_DELAY_MS = 400

const announcement = computed(() => {
  if (query.value.trim().length === 0) return ''
  if (matchCount === 0) return 'No subjects match'
  return `Showing ${matchCount} of ${totalCount} subjects`
})

const announced = ref('')

watchDebounced(
  announcement,
  (next) => {
    announced.value = next
  },
  { debounce: ANNOUNCEMENT_DELAY_MS }
)
</script>
