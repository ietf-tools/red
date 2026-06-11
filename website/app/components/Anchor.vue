<template>
  <NuxtLink v-if="!isOutsideNuxt" v-bind="sanitisedAnchorProps" data-is-nuxt-link>
    <slot />
  </NuxtLink>
  <a v-else v-bind="sanitisedAnchorProps" data-is-hyperlink>
    <slot />
  </a>
</template>

<script setup lang="ts">
/**
 * An anchor hyperlink that detects whether to use SPA Vue Router or a conventional hyperlink.
 *
 * If the link is external then target="_blank" and rel="noopener" will be added.
 *
 * If you want to ALSO detect RFC links and display a preview use AMaybeRFCLink.vue
 *
 * If you want to detect valid hrefs use AValidHref.vue
 */
import { computed } from 'vue'
import { NuxtLink } from '#components'
import { EXTERNAL_LINK_REL, TARGET_NEW_WINDOW } from '~/utilities/html'
import { isExternalLink, isOutsideNuxtLink } from '~/utilities/url'

const props = defineProps<{ href?: string; id?: string }>()

const isOutsideNuxt = computed(() => isOutsideNuxtLink(props.href))

const sanitisedAnchorProps = computed(() => {
  const isNuxtLink = !isOutsideNuxt.value
  const isExternal = isExternalLink(props.href)

  return {
    ...props,
    to: isNuxtLink ? props.href : undefined, // copy `href` to `to` for NuxtLink
    href: isNuxtLink ? undefined : props.href, // clobber 'href' with `undefined` when it's a NuxtLink
    rel: isExternal ? EXTERNAL_LINK_REL : undefined,
    target: isExternal ? TARGET_NEW_WINDOW : undefined
  }
})
</script>
