<template>
  <label>
    <span class="text-base font-bold text-blue-900 dark:text-slate-300 block mb-1">{{ props.label }}</span>
    <ais-refinement-list
      :attribute="props.attribute"
      :limit="props.doubleCols ? 10 : 5"
      :show-more-limit="maxItems"
      :searchable="props.searchable"
      :show-more="props.showMore"
    >
      <template
        #default="
          {
            items,
            isFromSearch,
            refine,
            searchForItems,
            toggleShowMore,
            canToggleShowMore,
            isShowingMore
          }"
      >
        <input
          v-if="props.searchable"
          class="w-full px-3 py-1.5 mb-3 text-base border border-gray-400 hover:border-black dark:border-white dark:hover:border-gray-300 dark:text-white bg-white dark:bg-black rounded-xs shadow-sm scheme-light dark:scheme-dark"
          :placeholder="props.searchPlaceholder"
          @input="searchForItems(($event.target as HTMLInputElement)?.value ?? '')"
          >
        <ul :class="['grid-cols-1 grid gap-1', props.doubleCols && '2xl:grid-cols-2']">
          <li v-if="isFromSearch && !items.length">No results.</li>
          <li v-for="item in items" :key="item.value" class="overflow-hidden whitespace-nowrap text-clip">
            <label class="text-base cursor-pointer">
              <input
                class="mr-2 size-5 align-middle shadow-sm scheme-light dark:scheme-dark"
                type="checkbox"
                :value="item.value"
                :checked="item.isRefined"
                @click="refine(item.value)"
              />
              <ais-highlight attribute="item" :hit="item" />
              <span class="bg-gray-400 dark:bg-gray-700 rounded-sm text-xs px-1 py-0.25 ml-2 text-white text-clip">{{ item.count.toLocaleString() }}</span>
            </label>
          </li>
        </ul>
        <div v-if="canToggleShowMore" class="mt-2">
          <div
            v-if="items.length >= maxItems && isShowingMore"
            class="text-gray-500 text-sm bg-gray-50 rounded p-2 italic flex items-center shadow mb-2"
            >
            <Icon name="fluent:warning-24-filled" size="2em" class="mr-2" />
            There may be more choices available. Use the search above to refine this list.
          </div>
          <button
            type="button"
            class="underline text-sky-700 dark:text-blue-100 px-3 py-2 -ml-3 cursor-pointer text-nowrap"
            :disabled="!canToggleShowMore"
            @click.prevent="toggleShowMore"
          >
            {{ !isShowingMore ? 'Show more' : 'Show less' }}
          </button>
        </div>
      </template>
    </ais-refinement-list>
  </label>
</template>

<script setup lang="ts">
import { AisHighlight, AisRefinementList } from 'vue-instantsearch/vue3/es'
import type { VueStyleClass } from '~/utilities/vue'

type Props = {
  attribute: string
  label: string
  searchable?: boolean
  searchPlaceholder?: string
  showMore?: boolean
  doubleCols?: boolean
  class?: VueStyleClass
}

const props = defineProps<Props>()

const maxItems = computed(() => props.doubleCols ? 100 : 50)
</script>
