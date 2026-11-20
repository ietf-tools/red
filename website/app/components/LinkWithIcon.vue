<template>
  <Anchor :href="href" :id="id">
    <slot />
    <OutsideLinkIcon :href="href" :size="size" />
  </Anchor>
</template>

<script setup lang="ts">
/**
 * An Anchor that also shows the new-window icon when the link leaves the IETF community's sites
 * (see utilities/url-destination.ts), so the icon and the new tab always go together.
 *
 * Like AValidHref.vue the `href` is checked against valid url patterns, but this one does not preview RFC
 * links, as Anchor.vue does not. Other attributes, such as `class`, are passed to the link.
 */
import type { ValidHrefs } from '~/utilities/url'

type Props = {
  href: ValidHrefs
  id?: string
  size?: 'default' | 'large'
}

const { href, id, size = 'default' } = defineProps<Props>()
</script>
