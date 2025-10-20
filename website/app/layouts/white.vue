<template>
  <div class="flex flex-col min-h-[100vh]">
    <Header>
      <slot name="subheader"></slot>
    </Header>
    <div class="bg-white dark:bg-black flex-1">
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
