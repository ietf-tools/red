<template>
  <p class="px-2">
    <Anchor
      :href="queueClustersUrl"
      :class="ANCHOR_COLOR_TAILWIND_STYLE"
    >
      Clusters
    </Anchor>
  </p>
</template>

<script setup lang="ts">
import { ANCHOR_COLOR_TAILWIND_STYLE } from '~/utilities/theme'
import { useRfcEditorQueueClustersUrl } from '~/utilities/url'

const queueClustersUrl = useRfcEditorQueueClustersUrl()
</script>