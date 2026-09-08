<template>
  <AMaybeRFCLink v-bind="props">
    <slot />
  </AMaybeRFCLink>
</template>

<script setup lang="ts">
/**
 * Strict TypeScript validation of `href` against valid url patterns.
 *
 * Helps prevent dead links, so perhaps you should prefer it over AMaybeRFCLink.vue or Anchor.vue.
 *
 */
import type { ValidHrefs } from '~/utilities/url'

type AnchorPropsWithValidHref = { href: ValidHrefs; id?: string }

const props = defineProps<AnchorPropsWithValidHref>()
</script>
