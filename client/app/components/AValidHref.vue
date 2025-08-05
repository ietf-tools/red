<template>
  <AMaybeRFCLink v-bind="props">
    <slot />
  </AMaybeRFCLink>
</template>

<script setup lang="ts">
import type { ValidHrefs } from '~/utilities/url'

type AnchorPropsWithValidHref = { href?: ValidHrefs; id?: string }

/**
 * TypeScript wrapper for links that attempts to detect invalid/valid hrefs as TypeScript failures
 */
const props = defineProps<AnchorPropsWithValidHref>()
</script>
