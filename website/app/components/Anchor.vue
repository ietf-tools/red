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
 * If the link is external then rel="noopener" will be added. If it goes outside the IETF community's sites
 * (see utilities/url-destination.ts) then target="_blank" will be added too. Links to those sites open in the same tab.
 *
 * Use LinkWithIcon.vue to ALSO show the new-window icon on those links.
 *
 * If you want to ALSO detect RFC links and display a preview use AMaybeRFCLink.vue
 *
 * If you want to ALSO detect valid hrefs use AValidHref.vue
 */
import { computed } from 'vue'
import { NuxtLink } from '#components'
import { EXTERNAL_LINK_REL, TARGET_NEW_WINDOW } from '~/utilities/html'
import { urlDestination } from '~/utilities/url-destination'
import { isOutsideNuxtLink } from '~/utilities/url'

const props = defineProps<{ href?: string; id?: string }>()

const isOutsideNuxt = computed(() => isOutsideNuxtLink(props.href))

const sanitisedAnchorProps = computed(() => {
  const isNuxtLink = !isOutsideNuxt.value
  const { href } = props
  // Without an `href` there is nowhere to say it goes, so it is treated as leaving the site
  const destination = href === undefined ? 'outside' : urlDestination(href)

  return {
    ...props,
    to: isNuxtLink ? href : undefined, // copy `href` to `to` for NuxtLink
    href: isNuxtLink ? undefined : href, // clobber 'href' with `undefined` when it's a NuxtLink
    // Every link off the site is kept from controlling this one, whether or not it opens a new tab
    rel: destination === 'internal' ? undefined : EXTERNAL_LINK_REL,
    target: destination === 'outside' ? TARGET_NEW_WINDOW : undefined
  }
})
</script>
