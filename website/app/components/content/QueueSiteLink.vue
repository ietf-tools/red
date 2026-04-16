<template>
  <p class="px-2">
    <Anchor
      :href="queueUrl"
      :class="ANCHOR_COLOR_TAILWIND_STYLE"
    >
      Public Queue
    </Anchor>
  </p>
</template>

<script setup lang="ts">
import { ANCHOR_COLOR_TAILWIND_STYLE } from '~/utilities/theme'
import { useQueueUrlOrigin } from '~/utilities/url'

const queueUrl = useQueueUrlOrigin()
</script>