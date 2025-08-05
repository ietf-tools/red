<template>
  <div class="lg:hidden">
    <TableOfContents
      :toc="props.toc"
      list-type="ordered"
      list-class=""
      nested-list-class="pl-5"
      :list-item-class="`no-underline text-sm py-2 px-2 border-t-1 border-t-gray-300 dark:border-t-gray-500 py-1 ${ANCHOR_TAILWIND_STYLE}`"
    >
      <Heading level="2" style-level="5" class="mb-1 pl-2">
        In this section
      </Heading>
    </TableOfContents>
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
