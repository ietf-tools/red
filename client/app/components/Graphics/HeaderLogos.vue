<template>
  <A href="/" :class="[props.class, 'pl-5 md:pl-0']">
    <img
      :src="LogoMobile"
      class="lg:hidden"
      alt="RFC Editor - Official home of RFCs"
      width="131"
      height="24"
    />
    <img
      :src="LogoDesktop"
      class="hidden lg:block"
      alt="RFC Editor - Official home of RFCs"
      width="183"
      height="37"
    />
  </A>
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
