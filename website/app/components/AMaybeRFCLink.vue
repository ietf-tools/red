<template>
  <RFCRouterLink v-if="isRfcLink && !disableRFCLinkPreview" v-bind="props" data-rfc-router-link>
    <slot />
  </RFCRouterLink>
  <Anchor v-else v-bind="props" data-non-rfc-anchor-link>
    <slot />
  </Anchor>
</template>

<script setup lang="ts">
/**
 * Detects links to RFCs (eg `/rfc/rfc9001.pdf` or `#RFC9001` ) and uses RFCRouterLink instead
 *
 * with a fallback to Anchor
 */
import RFCRouterLink from './RFCRouterLink.vue'
import Anchor from './Anchor.vue'
import { parseMaybeRfcLink } from '~/utilities/url'

const props = defineProps<{ href: string; id?: string }>()

const isRfcLink = computed(() => Boolean(parseMaybeRfcLink(props.href)))

const uiSettings = useUiSettingsStore()
const { disableRFCLinkPreview } = storeToRefs(uiSettings)
</script>
