<template>
  <div class="flex flex-col min-h-[100vh]">
    <HeaderWrapper>
      <Header />
    </HeaderWrapper>
    <div class="bg-white dark:bg-blue-975 flex-1">
      <HeaderWrapper>
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
