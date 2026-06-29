<template>
  <div v-html="noScriptHtml"></div>
</template>

<script setup lang="ts">
import { renderNoScriptMenuItem, useMenuData } from './HeaderNavData'

const menuData = useMenuData('mobile')

// Vue can't render <noscript> elements except in `v-html`, so we need to generate
// a menu in basic menu in HTML on the server
const noScriptHtml = computed(() => {
  return `<noscript data-nosnippet><ul class="w-full lg:hidden px-7 py-2 text-sm">${menuData.value
    .map((menuItem) =>
      renderNoScriptMenuItem(menuItem, {
        renderListDisc: true,
        menuHeaderTopSpacing: true
      })
    )
    .join('')}</ul></noscript>`
})
</script>
