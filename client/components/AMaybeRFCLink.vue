<template>
  <span>
    <RFCRouterLink
      v-if="isInternal && isRfcLink"
      v-bind="props"
    >
      <slot />
    </RFCRouterLink>
    <Anchor
      v-else
      v-bind="props"
    >
      <slot />
    </Anchor>
  </span>
</template>

<script setup lang="ts">
/**
 * Detects links to RFCs (eg `/rfc/rfc9001.pdf`) and uses RFCRouterLink instead
 *
 * with a fallback to Anchor
 */
import RFCRouterLink from './RFCRouterLink.vue'
import Anchor from './A.vue'
import { isInternalLink, parseMaybeRfcLink } from '~/utilities/url'

const props = defineProps<{ href?: string; id?: string }>()
const isInternal = computed(() => isInternalLink(props.href))
const isRfcLink = computed(() => !!parseMaybeRfcLink(props.href))
</script>
