<template>
  <!-- eslint-disable-next-line vue/no-v-html -- highlighted markup comes from the trusted search backend -->
  <span v-if="highlighted" :class="classNames?.root" v-html="highlighted" />
  <span v-else :class="classNames?.root">{{ value }}</span>
</template>

<script setup lang="ts">
import type { ClassNames } from '../types'

/**
 * Renders backend-provided highlighted markup for a value, falling back to plain text.
 * Backend-neutral: the host passes the highlighted string (already produced by the
 * search engine); the library does not know any highlight format.
 */
type Props = {
  value: string
  highlighted?: string
  classNames?: ClassNames
}

defineProps<Props>()
</script>
