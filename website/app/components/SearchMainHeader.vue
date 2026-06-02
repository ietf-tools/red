<template>
    <div class="bg-blue-900 dark:bg-blue-950">
        <Heading level="1" style-level="1"
            class="container mx-auto pl-5 pr-3 py-1 text-white text-balance">
            Search RFCs
        </Heading>
        <div class="px-6 container mx-auto" v-html="noScriptHtml" />
    </div>
    <div :id="INSTANTSEARCH_STICKY_CONTAINER_DOM_ID"
        class="lg:sticky lg:top-0 lg:z-60 bg-blue-900 dark:bg-blue-950 text-white mt-0">
        <div class="flex flex-row items-center pt-4 pb-4 container mx-auto pl-5 pr-3">
            <div class="w-full md:w-2/3">
                <ais-search-box autofocus :placeholder="SEARCH_PLACEHOLDER" :class-names="{
                    'ais-SearchBox-form': 'w-full flex ml-1',
                    'ais-SearchBox-input': aisSearchboxInputClass,
                    'ais-SearchBox-submit':
                        'bg-blue-200 px-2 flex items-center rounded-r-xs',
                    'ais-SearchBox-reset': 'hidden',
                    'ais-SearchBox-loadingIndicator':
                        'bg-yellow-400 px-2 flex items-center text-white'
                }" show-loading-indicator @input="scrollUpToNewSearchResults">
                    <template #submit-icon>
                        <Icon name="fluent:search-12-filled" size="2em" />
                    </template>
                    <template #loading-indicator>
                        <Icon name="eos-icons:loading" size="2em" />
                    </template>
                </ais-search-box>
            </div>
            <div class="hidden md:block pl-5 grow">
                <ClientOnly>
                    <SearchInRfcComments />
                    <template #fallback>
                        <div :class="[
                            aisSearchboxInputClass,
                            'invisible' // ie visibility:hidden so that it still takes up layout space
                        ]">
                            &nbsp;
                        </div>
                    </template>
                </ClientOnly>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { AisSearchBox } from 'vue-instantsearch/vue3/es'
import { INSTANTSEARCH_STICKY_CONTAINER_DOM_ID, scrollUpToNewSearchResults } from '../utilities/typesense'
import { NOSCRIPT_IFRAME_DOM_ID, SEARCH_PLACEHOLDER } from '~/utilities/search';
import { API_NO_JS_SERVER_SEARCH_PATH } from '~/utilities/url';

const aisSearchboxInputClass = 'flex-1 min-w-0 bg-white text-black dark:bg-black dark:text-white dark:border-white dark:border pl-4 py-3 pr-2 h-12 rounded-l-xs'

const apiKey = useTypesenseApiKey()

const noScriptHtml = computed(() => {
    return `<noscript data-nosnippet>
        <div style="background-color: #ffc9c9; color: #9f0712; padding: 7px; text-size: .9rem;"><b>Your browser has JavaScript disabled.</b> A basic search is available, but please enable JavaScript for many more search features.</div>
        <form method="get" action="${API_NO_JS_SERVER_SEARCH_PATH}" target="${NOSCRIPT_IFRAME_DOM_ID}" class="flex flex-row pt-6 pb-2 md:pb-3" @submit.stop.prevent="handleSearch">
            <input id="search" ref="search-input" v-model="searchQuery" type="search" name="q"
            class="min-w-[0px] w-full bg-white text-black dark:bg-black dark:text-white dark:border-white dark:border pl-4 md:pl-6 py-3"
            :placeholder="SEARCH_PLACEHOLDER" aria-label="Find an RFC (number, subseries, title, author, etc.)" />
            <input type="hidden" name="x-typesense-api-key" value="${apiKey}" />
            <button type="submit" id="search" class="bg-blue-200 px-2 flex items-center text-white" aria-label="Submit search">
                Search
            </button>
        </form>
     </noscript>`
})
</script>
