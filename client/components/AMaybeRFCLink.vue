<template>
  <RFCRouterLink
    v-if="isRfcEditor && isRfcLink"
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
</template>

<script setup lang="ts">
/**
 * Detects links to RFCs (eg `/rfc/rfc9001.pdf`) and uses RFCRouterLink instead
 *
 * with a fallback to Anchor
 */
import RFCRouterLink from './RFCRouterLink.vue'
import Anchor from './A.vue'
import { isRfcEditorSite, parseMaybeRfcLink } from '~/utilities/url'

const props = defineProps<{ href?: string; id?: string }>()
const isRfcEditor = isRfcEditorSite(props.href)
const isRfcLink = !!parseMaybeRfcLink(props.href)
</script>
