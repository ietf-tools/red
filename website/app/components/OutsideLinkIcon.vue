<template>
  <GraphicsNewWindowIcon v-if="isOutside" :class="SIZE_CLASSES[size]" />
</template>

<script setup lang="ts">
/**
 * The new-window icon, for a link that leaves the IETF community's sites (see utilities/url-destination.ts).
 * Links to those sites open in the same tab, so they get no icon.
 *
 * Put it inside the link. Use LinkWithIcon.vue to get the link and the icon together.
 */
import { computed } from 'vue'
import { urlDestination } from '~/utilities/url-destination'

type Props = {
  href?: string
  /** `large` is the size used beside underlined text in dialogs and notices. */
  size?: 'default' | 'large'
}

const { href, size = 'default' } = defineProps<Props>()

const SIZE_CLASSES = {
  default: 'inline-block text-lg align-middle ml-1',
  large: 'inline-block text-xl -mt-2 align-middle ml-1'
} as const

// A link without an `href` opens a new window (see Anchor.vue), so it gets the icon
const isOutside = computed(() => href === undefined || urlDestination(href) === 'outside')
</script>
