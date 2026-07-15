<template>
  <AMaybeRFCLink :id="props.id" :href="props.href!" :class="ANCHOR_COLOR_TAILWIND_STYLE">
    <slot />
    <GraphicsNewWindowIcon v-if="!isInternal && !isMailTo && !isHash" class="inline-block text-lg align-middle ml-1" />
    <GraphicsMail v-if="isMailTo" class="inline-block text-lg align-middle ml-1" />
    <GraphicsRssFeed v-if="isRSSFeed" class="inline-block text-lg align-middle ml-1" />
    <GraphicsAtomFeed v-if="isAtomFeed" class="inline-block text-lg align-middle ml-1" />
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
