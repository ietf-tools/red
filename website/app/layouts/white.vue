<template>
  <div class="flex flex-col min-h-[100vh]">
    <HeaderWrapper :class="!props.hasSubHeader ? 'border-b border-b-white dark:border-b-blue-900' : undefined">
      <Header />
    </HeaderWrapper>
    <div class="bg-white dark:bg-blue-975 flex-1">
      <HeaderWrapper :class="props.hasSubHeader ? 'border-b border-b-white dark:border-b-blue-900' : undefined">
        <slot name="subheader" />
      </HeaderWrapper>
      <Main>
        <slot />
      </Main>
    </div>
    <Footer />
  </div>
</template>

<style>
html {
  /* https://fonts.nuxt.com/get-started/configuration */
  font-family: 'Inter', sans-serif;
}
</style>

<script setup lang="ts">
type Props = {
  hasSubHeader?: boolean
}

const props = defineProps<Props>()
</script>
