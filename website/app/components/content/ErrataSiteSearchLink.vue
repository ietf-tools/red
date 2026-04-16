<template>
  <p class="px-2">
    <Anchor
      :href="errataSiteSearchUrl"
      :class="ANCHOR_COLOR_TAILWIND_STYLE"
    >
      Errata Search
    </Anchor>
  </p>
</template>

<script setup lang="ts">
import { ANCHOR_COLOR_TAILWIND_STYLE } from '~/utilities/theme'
import { useRfcEditorErrataSearchUrl } from '~/utilities/url'

const errataSiteSearchUrl = useRfcEditorErrataSearchUrl()
</script>