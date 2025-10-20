<template>
  <div class="flex flex-col min-h-[100vh]">
    <Header>
      <slot name="subheader"></slot>
    </Header>
    <Main :class="props.mainClass">
      <slot />
    </Main>
    <Footer />
  </div>
</template>

<script setup lang="ts">
import type { VueStyleClass } from '~/utilities/vue'

type Props = {
  mainClass?: VueStyleClass
}

const props = defineProps<Props>()
</script>

<style>
html {
  /* https://fonts.nuxt.com/get-started/configuration */
  font-family: 'Inter', sans-serif;
}
</style>
