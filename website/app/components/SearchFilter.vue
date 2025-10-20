<template>
  <form
    class="flex flex-col gap-5 text-base text-grey-800 pt-3 lg:pt-0 pl-5 lg:pl-0 lg:pr-10"
  >
    <div class="hidden text-blue-900 dark:text-slate-300 lg:flex items-center">
      <Heading level="2" style-level="3">
        Filter
      </Heading>
      <SearchClearRefinements class="ml-4" />
    </div>

    <SearchFilterStatuses />

    <Separator orientation="horizontal" decorative class="bg-gray-300 dark:bg-gray-700 data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full" />

    <SearchFilterDisplay
      :attributes="[{ attribute: 'flags.obsoleted', label: 'obsoleted' }]"
    />

    <Separator orientation="horizontal" decorative class="bg-gray-300 dark:bg-gray-700 data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full" />

    <SearchFilterDate
      label="Publication date"
      attribute="publicationDate"
    />

    <SearchFilterSelect
      label="Stream"
      attribute="stream.name"
    />

    <SearchFilterSelect
      label="Area"
      attribute="area.full"
    />

    <SearchFilterList
      label="Working group"
      attribute="group.full"
      searchable
      search-placeholder="Search for group..."
      show-more
    />

    <SearchFilterList
      label="Author"
      attribute="authors.name"
      searchable
      search-placeholder="Search for author..."
      show-more
      double-cols
    />
  </form>
</template>

<script setup lang="ts">
// import { Separator } from 'reka-ui'
</script>