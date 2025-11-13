<template>
    <Heading
        level="1"
        style-level="1"
        class="bg-blue-900 text-white px-2 py-1 text-balance"
    >
        Search RFCs
    </Heading>
    <div class="sticky top-0 z-50 bg-blue-900 text-white mt-0 container mx-auto">
        <div class="flex flex-row items-center pt-4 pb-4 ml-2">
            <div class="w-full md:w-2/3">
                <ais-search-box
                    autofocus
                    placeholder="Find an RFC (number, subseries, title, author, etc.)"
                    :class-names="{
                        'ais-SearchBox-form': 'w-full flex',
                        'ais-SearchBox-input':
                            aisSearchboxInputClass,
                        'ais-SearchBox-submit':
                            'bg-blue-200 px-2 flex items-center rounded-r-xs',
                        'ais-SearchBox-reset': 'hidden',
                        'ais-SearchBox-loadingIndicator':
                            'bg-yellow-400 px-2 flex items-center text-white'
                    }"
                    show-loading-indicator
                >
                    <template #submit-icon>
                        <Icon
                            name="fluent:search-12-filled"
                            size="2em"
                        />
                    </template>
                    <template #loading-indicator>
                        <Icon
                            name="eos-icons:loading"
                            size="2em"
                        />
                        <div class="bg-red-500 w-5 h-5"></div>
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

const aisSearchboxInputClass = 'flex-1 min-w-0 bg-white text-black dark:bg-black dark:text-white dark:border-white dark:border pl-4 py-3 pr-2 h-12 rounded-l-xs'
</script>
