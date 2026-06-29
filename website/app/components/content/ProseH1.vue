<template>
  <Heading v-bind="$attrs" level="1" class="mt-2 px-2 max-w-[var(--max-text-block-width)]" :has-internal-link="false">
    <slot />
  </Heading>
  <TableOfContentsMarkdownMobile v-if="tocInjection?.showToc && tocInjection?.toc" :toc="tocInjection?.toc" />
</template>

<script setup lang="ts">
import { tocKey } from '../../utilities/tableOfContents'

const tocInjection = inject(tocKey)
</script>
