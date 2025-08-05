<template>
  <Heading
    v-bind="$attrs"
    level="1"
    class="pt-5 pb-3 px-2"
    :has-internal-link="false"
  >
    <slot />
  </Heading>
  <TableOfContentsMarkdownMobile
    v-if="tocInjection?.showToc && tocInjection?.toc"
    :toc="tocInjection?.toc"
  />
</template>

<script setup lang="ts">
import { tocKey } from '../../utilities/tableOfContents'

const tocInjection = inject(tocKey)
</script>
