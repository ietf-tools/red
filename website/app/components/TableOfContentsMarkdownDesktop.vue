<template>
  <div class="hidden lg:sticky lg:top-[0px] lg:h-screen lg:flex lg:flex-col lg:min-w-[300px]">
    <TableOfContentsHighlight
      :toc="props.toc"
      list-type="ordered"
      wrapper-class="flex flex-col min-h-0 pt-4 pb-2 px-4"
      list-class="mr-1"
      nested-list-class="pl-2"
      :links-class="`block text-sm py-2 border-t-1 border-t-gray-300 dark:border-t-gray-500 no-underline hover:underline ${ANCHOR_TAILWIND_STYLE}`"
      links-active-class="toc-highlight"
      link-class="block no-underline hover:underline"
      last-link-class="flex-1 flex justify-between"
      :show-last-link-icon="true"
    >
      <Heading
        level="2"
        style-level="5"
        class="mb-1 text-gray-800 dark:text-gray-300"
      >
        In this section
      </Heading>
    </TableOfContentsHighlight>
  </div>
</template>

<script setup lang="ts">
import type { RfcEditorToc } from '~/utilities/tableOfContents'
import { ANCHOR_TAILWIND_STYLE } from '~/utilities/theme'

type Props = {
  toc: RfcEditorToc
}

const props = defineProps<Props>()
</script>
