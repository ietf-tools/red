<template>
  <AMaybeRFCLink
    :id="props.id"
    :href="props.href!"
    :class="ANCHOR_COLOR_TAILWIND_STYLE"
  >
    <slot />
    <Icon
      v-if="!isInternal && !isMailTo && !isHash"
      name="fluent:window-new-20-regular"
      class="text-lg align-middle ml-1"
    />
    <Icon
      v-if="isMailTo"
      name="fluent:mail-all-20-regular"
      class="text-lg align-middle ml-1"
    />
    <Icon
      v-if="isRSSFeed"
      name="ic:sharp-rss-feed"
      class="text-lg align-middle ml-1"
    />
    <Icon
      v-if="isAtomFeed"
      name="vscode-icons:file-type-atom"
      class="text-lg align-middle ml-1"
    />
  </AMaybeRFCLink>
</template>

<script setup lang="ts">
import { ANCHOR_COLOR_TAILWIND_STYLE } from '~/utilities/theme'
import { isHashLink, isInternalLink, isMailToLink, isRSSLink, isAtomLink } from '~/utilities/url'

const props = defineProps<{ href?: string; id?: string }>()

const isInternal = computed(() => isInternalLink(props.href))
const isMailTo = computed(() => isMailToLink(props.href))
const isHash = computed(() => isHashLink(props.href))
const isRSSFeed = computed(() => isRSSLink(props.href))
const isAtomFeed = computed(() => isAtomLink(props.href))
</script>