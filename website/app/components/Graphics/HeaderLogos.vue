<template>
  <Anchor
    href="/"
    :class="[
      props.class,
      'bg-blue-900 dark:bg-blue-950 forced-color-adjust-none', // for high contrast mode
      'inline-block px-2 pt-1 pb-1 rounded-md'
    ]">
    <img :src="LogoMobile" class="lg:hidden" alt="RFC Editor - Official home of RFCs" width="131" height="24" />
    <img :src="LogoDesktop" class="hidden lg:block" alt="RFC Editor - Official home of RFCs" width="183" height="37" />
  </Anchor>
</template>

<script setup lang="ts">
import LogoDesktop from 'assets/logo-desktop.svg'
import LogoMobile from 'assets/logo-mobile.svg'
import type { VueStyleClass } from '~/utilities/vue'

type Props = {
  class?: VueStyleClass
}

const props = defineProps<Props>()
</script>
